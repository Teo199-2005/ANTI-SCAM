<?php

declare(strict_types=1);

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\ResortRegistrationService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ResortRegistrationController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly ResortRegistrationService $registration,
    ) {}

    public function show(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'resort_owner') {
            return $this->errorResponse('Forbidden.', null, 403);
        }

        return $this->successResponse($this->registration->registrationStateForUser($user));
    }

    public function updateStep(Request $request, int $step)
    {
        if ($step < 1 || $step > 6) {
            return $this->errorResponse('Invalid step.', null, 422);
        }

        $user = $request->user();
        $data = $request->all();

        $draftSave = $request->boolean('draft');

        return $this->successResponse(
            $this->registration->saveStep($user, $step, $data, $draftSave),
            'Saved',
        );
    }

    public function finish(Request $request)
    {
        $user = $request->user();

        return $this->successResponse(
            $this->registration->finishRegistration($user),
            'Registration complete',
        );
    }

    public function uploadLogo(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'image', 'max:10240']]);

        $url = $this->registration->storeDraftLogo(
            $request->user(),
            $request->file('file'),
        );

        return $this->successResponse(['logo_url' => $url], 'Logo uploaded');
    }

    public function uploadRoomPhoto(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'max:10240', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $file = $request->file('file');
        $path = $file->store('registration-drafts/'.$request->user()->id.'/rooms', 'public');
        $url = \Illuminate\Support\Facades\Storage::disk('public')->url($path);

        return $this->successResponse(['url' => $url], 'Photo uploaded');
    }

    public function uploadVerificationDocument(Request $request, string $documentType)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,pdf'],
        ]);

        $doc = $this->registration->storeVerificationDocument(
            $request->user(),
            $documentType,
            $request->file('file'),
        );

        return $this->successResponse([
            'document_type' => $doc->document_type,
            'path' => $doc->path,
            'uploaded_at' => $doc->uploaded_at?->toIso8601String(),
        ], 'Document uploaded');
    }
}
