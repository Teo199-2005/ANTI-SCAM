<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Resort;
use App\Models\ResortRegistrationDraft;
use App\Models\ResortVerificationDocument;
use App\Models\Room;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Support\ResortRegistrationCatalog;
use App\Support\StoredMedia;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

final class AdminResortVerificationService
{
    public function __construct(
        private readonly AuditLogService $audits,
        private readonly LandingReadinessService $landingReadiness,
        private readonly PhilippineLocationService $locations,
        private readonly ResortVerificationNotificationService $notifications,
    ) {}

    public function queueStats(): array
    {
        $awaiting = Resort::withoutGlobalScopes()
            ->where('verification_status', 'pending')
            ->whereNotNull('verification_submitted_at')
            ->count();

        $reviewers = User::withoutGlobalScopes()
            ->where('role', 'admin')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email])
            ->all();

        return [
            'awaiting_review' => $awaiting,
            'reviewers' => $reviewers,
        ];
    }

    public function list(Request $request): LengthAwarePaginator
    {
        $validated = validator($request->all(), [
            'filter' => ['sometimes', 'string', Rule::in(['awaiting_review', 'verified', 'rejected', 'needs_documents', 'not_verified', 'all'])],
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'perPage' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ])->validate();

        $filter = (string) ($validated['filter'] ?? 'awaiting_review');
        $search = trim((string) ($validated['search'] ?? ''));
        $perPage = (int) ($validated['perPage'] ?? 15);

        $query = Resort::withoutGlobalScopes()
            ->with(['tenant:id,subdomain'])
            ->withCount('rooms')
            ->orderByDesc('verification_submitted_at')
            ->orderBy('name');

        match ($filter) {
            'awaiting_review' => $query
                ->where('verification_status', 'pending')
                ->whereNotNull('verification_submitted_at'),
            'verified' => $query->where('verification_status', 'verified'),
            'rejected' => $query->where('verification_status', 'rejected'),
            'needs_documents' => $query->where('verification_status', 'needs_documents'),
            'not_verified' => $query->where('verification_status', 'not_verified'),
            default => null,
        };

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like): void {
                $q->where('name', 'like', $like)
                    ->orWhere('contact_number', 'like', $like)
                    ->orWhereHas('tenant', fn ($t) => $t->where('subdomain', 'like', $like));
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(Resort $resort): array
    {
        $resort->load([
            'verificationDocuments',
            'tenant:id,subdomain',
            'businessProfile',
            'subscription',
            'verificationAssignee:id,name,email',
        ])->loadCount('rooms');

        $owner = $this->landingReadiness->resolveOwner($resort);
        $draftPayload = $owner
            ? (ResortRegistrationDraft::query()->where('user_id', $owner->id)->value('payload') ?? [])
            : [];
        if (! is_array($draftPayload)) {
            $draftPayload = [];
        }

        $photoCount = Room::withoutGlobalScopes()
            ->where('resort_id', $resort->id)
            ->withCount('images')
            ->get()
            ->sum('images_count');

        $uploadedTypes = $resort->verificationDocuments->pluck('document_type')->all();
        $missingDocTypes = array_values(array_diff(
            ResortRegistrationCatalog::verificationDocumentTypes(),
            $uploadedTypes,
        ));

        return [
            'resort' => $this->resortDetailPayload($resort, $photoCount),
            'owner' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'phone' => $owner->phone,
                'contact_number' => $owner->phone,
            ] : null,
            'business' => $this->businessPayload($resort, $draftPayload['step2'] ?? []),
            'registration' => $this->registrationPayload($draftPayload),
            'documents' => $resort->verificationDocuments
                ->sortBy('document_type')
                ->values()
                ->map(fn (ResortVerificationDocument $doc) => $this->documentPayload($doc))
                ->all(),
            'required_document_types' => ResortRegistrationCatalog::verificationDocumentTypes(),
            'missing_document_types' => $missingDocTypes,
        ];
    }

    public function approve(User $admin, Resort $resort, array $data): Resort
    {
        if ($resort->verification_submitted_at === null) {
            throw ValidationException::withMessages([
                'resort' => ['This resort has not submitted verification documents yet.'],
            ]);
        }

        if (($resort->verification_status ?? 'pending') === 'verified') {
            throw ValidationException::withMessages([
                'resort' => ['This resort is already verified.'],
            ]);
        }

        foreach (ResortRegistrationCatalog::verificationDocumentTypes() as $type) {
            if (! $resort->verificationDocuments()->where('document_type', $type)->exists()) {
                throw ValidationException::withMessages([
                    'documents' => ["Missing required document: {$type}."],
                ]);
            }
        }

        $validated = validator($data, [
            'list_publicly' => ['sometimes', 'boolean'],
            'reason' => ['nullable', 'string', 'max:500'],
        ])->validate();

        $listPublicly = (bool) ($validated['list_publicly'] ?? false);
        $old = [
            'verification_status' => $resort->verification_status,
            'verified_at' => $resort->verified_at?->toIso8601String(),
            'is_publicly_listed' => $resort->is_publicly_listed,
        ];

        $resort->update([
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verification_rejection_reason' => null,
            'is_publicly_listed' => $listPublicly,
        ]);

        $resort = $resort->fresh();

        $this->notifications->notifyOwnerApproved($resort);

        $this->audits->log(
            'resort_verification_approved',
            'resort',
            $resort->id,
            $old,
            [
                'verification_status' => 'verified',
                'verified_at' => $resort->verified_at?->toIso8601String(),
                'is_publicly_listed' => $resort->is_publicly_listed,
            ],
            ['actor_user_id' => $admin->id],
            $validated['reason'] ?? null,
        );

        return $resort->fresh(['tenant', 'verificationDocuments'])->loadCount('rooms');
    }

    public function reject(User $admin, Resort $resort, array $data): Resort
    {
        if ($resort->verification_submitted_at === null) {
            throw ValidationException::withMessages([
                'resort' => ['This resort has not submitted verification documents yet.'],
            ]);
        }

        $validated = validator($data, [
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ])->validate();

        $old = [
            'verification_status' => $resort->verification_status,
            'is_publicly_listed' => $resort->is_publicly_listed,
        ];

        $reason = $validated['reason'];

        $resort->update([
            'verification_status' => 'rejected',
            'verified_at' => null,
            'verification_rejection_reason' => $reason,
            'is_publicly_listed' => false,
        ]);

        $resort = $resort->fresh();

        $this->notifications->notifyOwnerRejected($resort, $reason, false);

        $this->audits->log(
            'resort_verification_rejected',
            'resort',
            $resort->id,
            $old,
            [
                'verification_status' => 'rejected',
                'is_publicly_listed' => false,
            ],
            ['actor_user_id' => $admin->id],
            $reason,
        );

        return $resort->fresh(['tenant', 'verificationDocuments'])->loadCount('rooms');
    }

    public function requestMoreDocuments(User $admin, Resort $resort, array $data): Resort
    {
        $validated = validator($data, [
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ])->validate();

        $reason = $validated['reason'];

        $resort->update([
            'verification_status' => 'needs_documents',
            'verified_at' => null,
            'verification_rejection_reason' => $reason,
            'is_publicly_listed' => false,
        ]);

        $resort = $resort->fresh();

        $this->notifications->notifyOwnerRejected($resort, $reason, true);

        $this->audits->log(
            'resort_verification_needs_documents',
            'resort',
            $resort->id,
            null,
            ['verification_status' => 'needs_documents'],
            ['actor_user_id' => $admin->id],
            $reason,
        );

        return $resort->fresh(['tenant', 'verificationDocuments'])->loadCount('rooms');
    }

    public function updateReview(Resort $resort, array $data): Resort
    {
        $validated = validator($data, [
            'verification_assigned_to_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'verification_admin_notes' => ['nullable', 'string', 'max:5000'],
            'verification_scheduled_at' => ['nullable', 'date'],
            'verification_scheduled_notes' => ['nullable', 'string', 'max:500'],
        ])->validate();

        $resort->update([
            'verification_assigned_to_user_id' => $validated['verification_assigned_to_user_id'] ?? null,
            'verification_admin_notes' => $validated['verification_admin_notes'] ?? null,
            'verification_scheduled_at' => $validated['verification_scheduled_at'] ?? null,
            'verification_scheduled_notes' => $validated['verification_scheduled_notes'] ?? null,
        ]);

        return $resort->fresh(['tenant', 'verificationAssignee', 'verificationDocuments'])->loadCount('rooms');
    }

    /**
     * Allow admin to directly set the verification status of a resort.
     */
    public function updateStatus(User $admin, Resort $resort, array $data): Resort
    {
        $allowedStatuses = ['not_verified', 'pending', 'verified', 'rejected', 'needs_documents'];

        $validated = validator($data, [
            'verification_status' => ['required', 'string', Rule::in($allowedStatuses)],
            'reason' => ['nullable', 'string', 'max:500'],
        ])->validate();

        $newStatus = $validated['verification_status'];
        $oldStatus = $resort->verification_status ?? 'not_verified';

        if ($oldStatus === $newStatus) {
            throw ValidationException::withMessages([
                'verification_status' => ['Resort already has this status.'],
            ]);
        }

        $old = [
            'verification_status' => $oldStatus,
            'verified_at' => $resort->verified_at?->toIso8601String(),
            'is_publicly_listed' => $resort->is_publicly_listed,
        ];

        $updateData = [
            'verification_status' => $newStatus,
        ];

        // When setting to verified, set verified_at
        if ($newStatus === 'verified') {
            $updateData['verified_at'] = now();
            $updateData['verification_rejection_reason'] = null;
        } else {
            $updateData['verified_at'] = null;
        }

        // When rejecting or needing documents, unlist the resort
        if (in_array($newStatus, ['rejected', 'needs_documents', 'not_verified'], true)) {
            $updateData['is_publicly_listed'] = false;
        }

        if ($validated['reason'] ?? null) {
            $updateData['verification_rejection_reason'] = $validated['reason'];
        }

        $resort->update($updateData);
        $resort = $resort->fresh();

        $this->audits->log(
            'resort_verification_status_changed',
            'resort',
            $resort->id,
            $old,
            [
                'verification_status' => $newStatus,
                'verified_at' => $resort->verified_at?->toIso8601String(),
                'is_publicly_listed' => $resort->is_publicly_listed,
            ],
            ['actor_user_id' => $admin->id],
            $validated['reason'] ?? "Status changed from {$oldStatus} to {$newStatus}",
        );

        return $resort->fresh(['tenant', 'verificationDocuments'])->loadCount('rooms');
    }

    public function downloadDocumentsZip(Resort $resort): BinaryFileResponse
    {
        $resort->load('verificationDocuments');
        $slug = Str::slug($resort->name) ?: 'resort-'.$resort->id;
        $filename = "verification-{$slug}-{$resort->id}.zip";
        $tmp = tempnam(sys_get_temp_dir(), 'verify-zip-');

        $zip = new ZipArchive;
        if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw ValidationException::withMessages(['documents' => ['Could not create document archive.']]);
        }

        foreach ($resort->verificationDocuments as $doc) {
            $disk = Storage::disk($doc->disk);
            if (! $disk->exists($doc->path)) {
                continue;
            }
            $local = $disk->path($doc->path);
            $entry = $doc->document_type.'-'.($doc->original_name ?: basename($doc->path));
            $zip->addFile($local, $entry);
        }

        $zip->close();

        return response()->download($tmp, $filename, ['Content-Type' => 'application/zip'])->deleteFileAfterSend();
    }

    /**
     * @return array<string, mixed>
     */
    private function resortSummary(Resort $resort): array
    {
        return [
            'id' => $resort->id,
            'tenant_id' => $resort->tenant_id,
            'name' => $resort->name,
            'subdomain' => $resort->tenant?->subdomain,
            'contact_number' => $resort->contact_number,
            'logo_url' => $resort->logo_url,
            'verification_status' => $resort->verification_status,
            'verification_method' => $resort->verification_method,
            'verification_submitted_at' => $resort->verification_submitted_at?->toIso8601String(),
            'verified_at' => $resort->verified_at?->toIso8601String(),
            'is_publicly_listed' => $resort->is_publicly_listed,
            'rooms_count' => $resort->rooms_count,
            'hospitality_type' => $resort->hospitality_type,
            'verification_rejection_reason' => $resort->verification_rejection_reason,
            'verification_submission_count' => (int) ($resort->verification_submission_count ?? 0),
            'verification_assigned_to_user_id' => $resort->verification_assigned_to_user_id,
            'verification_admin_notes' => $resort->verification_admin_notes,
            'verification_scheduled_at' => $resort->verification_scheduled_at?->toIso8601String(),
            'verification_scheduled_notes' => $resort->verification_scheduled_notes,
            'verification_assignee' => $resort->relationLoaded('verificationAssignee') && $resort->verificationAssignee
                ? [
                    'id' => $resort->verificationAssignee->id,
                    'name' => $resort->verificationAssignee->name,
                    'email' => $resort->verificationAssignee->email,
                ]
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resortDetailPayload(Resort $resort, int $photoCount): array
    {
        $amenities = is_array($resort->amenities) ? $resort->amenities : [];

        return [
            ...$this->resortSummary($resort),
            'description' => $resort->description,
            'address_display' => $this->locations->resortDisplayLine($resort),
            'address_street_line' => $resort->address_street_line,
            'representative_name' => $resort->representative_name,
            'representative_contact_number' => $resort->representative_contact_number,
            'facebook_url' => $resort->facebook_url,
            'instagram_url' => $resort->instagram_url,
            'tiktok_url' => $resort->tiktok_url,
            'website_url' => $resort->website_url,
            'amenities' => $amenities,
            'amenities_count' => count($amenities),
            'room_photo_count' => $photoCount,
            'subscription_plan' => $resort->subscription?->plan,
            'subscription_status' => $resort->subscription?->status,
            'is_vip' => (bool) $resort->is_vip,
        ];
    }

    /**
     * @param  array<string, mixed>  $step2
     * @return array<string, mixed>|null
     */
    private function businessPayload(Resort $resort, array $step2): ?array
    {
        $profile = $resort->businessProfile;
        if ($profile) {
            return [
                'business_status' => $profile->business_status,
                'business_name' => $profile->business_name,
                'business_address' => $profile->business_address,
                'business_contact_number' => $profile->business_contact_number,
                'business_tin' => $profile->business_tin,
                'sec_dti_number' => $profile->sec_dti_number,
            ];
        }

        if ($step2 === []) {
            return null;
        }

        return [
            'business_status' => $step2['business_status'] ?? ($step2['no_registered_business'] ?? false ? 'unregistered' : 'registered'),
            'business_name' => $step2['business_name'] ?? null,
            'business_address' => $step2['business_address'] ?? null,
            'business_contact_number' => $step2['business_contact_number'] ?? null,
            'business_tin' => $step2['business_tin'] ?? null,
            'sec_dti_number' => $step2['sec_dti_number'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>|null
     */
    private function registrationPayload(array $payload): ?array
    {
        $step3 = is_array($payload['step3'] ?? null) ? $payload['step3'] : [];
        $step4 = is_array($payload['step4'] ?? null) ? $payload['step4'] : [];
        $step5 = is_array($payload['step5'] ?? null) ? $payload['step5'] : [];

        if ($step3 === [] && $step4 === [] && $step5 === []) {
            return null;
        }

        $rooms = is_array($step4['rooms'] ?? null) ? $step4['rooms'] : [];
        $priced = is_array($step5['rooms'] ?? null) ? $step5['rooms'] : [];

        return [
            'property_name' => $step3['property_name'] ?? null,
            'planned_room_count' => $step3['planned_room_count'] ?? null,
            'rooms_in_draft' => count($rooms),
            'rooms_priced' => count($priced),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function documentPayload(ResortVerificationDocument $doc): array
    {
        return [
            'document_type' => $doc->document_type,
            'original_name' => $doc->original_name,
            'url' => StoredMedia::urlForStoredFile((string) $doc->disk, (string) $doc->path),
            'uploaded_at' => $doc->uploaded_at?->toIso8601String(),
        ];
    }
}
