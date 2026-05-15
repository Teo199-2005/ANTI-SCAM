<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Legal\PlatformTerms;
use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EmailNotificationService;
use App\Services\EmailVerificationOtpService;
use App\Services\PasswordResetOtpService;
use App\Services\PhilippineLocationService;
use App\Services\ReferralSignupTrialService;
use App\Services\ResortOwnerOnboardingService;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\GcashAccountNormalizer;
use App\Support\MarketingGovIdCatalog;
use App\Support\PlatformPasswordRules;
use App\Support\StoredMedia;
use App\Support\UserProfilePresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly EmailVerificationOtpService $emailOtpService,
        private readonly PasswordResetOtpService $passwordResetOtpService,
        private readonly EmailNotificationService $emailNotifications,
        private readonly PhilippineLocationService $locations,
        private readonly ReferralSignupTrialService $referralSignupTrial,
        private readonly ResortOwnerOnboardingService $ownerOnboarding,
    ) {}

    public function register(Request $request)
    {
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'business_name' => ['nullable', 'string', 'max:190'],
            'role_intent' => ['nullable', 'in:resort_owner,client,guest'],
            'resort_subdomain' => [
                Rule::requiredIf(fn () => ($request->input('role_intent') ?? 'resort_owner') === 'guest'),
                'nullable',
                'string',
                'max:120',
            ],
            'accept_terms' => ['required', 'accepted'],
            'password' => PlatformPasswordRules::requiredWithConfirmation(),
            'referral_code' => ['nullable', 'string', 'max:32'],
        ]);

        $roleIntent = $validated['role_intent'] ?? 'resort_owner';

        $homeResortId = null;
        if ($roleIntent === 'guest') {
            $slug = mb_strtolower(trim((string) ($validated['resort_subdomain'] ?? '')));
            $tenant = Tenant::withoutGlobalScopes()
                ->where('subdomain', $slug)
                ->where('status', 'active')
                ->first();
            if (! $tenant) {
                throw ValidationException::withMessages([
                    'resort_subdomain' => ['This resort link is invalid or inactive.'],
                ]);
            }
            $resort = Resort::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('is_publicly_listed', true)
                ->first();
            if (! $resort) {
                throw ValidationException::withMessages([
                    'resort_subdomain' => ['This resort is not accepting public bookings yet.'],
                ]);
            }
            $homeResortId = $resort->id;
        }

        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $roleIntent,
            'terms_accepted_at' => now(),
            'terms_version' => PlatformTerms::version(),
        ];
        if ($roleIntent === 'guest') {
            $payload['home_resort_id'] = $homeResortId;
        }

        $user = User::create($payload);

        $referralTrialPayload = ['referral_trial' => $this->referralSignupTrial->trialPayloadForUser($user)];
        $referralCode = trim((string) ($validated['referral_code'] ?? ''));
        $businessName = isset($validated['business_name']) ? trim((string) $validated['business_name']) : null;

        if ($referralCode !== '' && $roleIntent === 'resort_owner') {
            $referralTrialPayload = $this->referralSignupTrial->redeemAtRegistration(
                $user,
                $referralCode,
                $businessName !== '' ? $businessName : null,
            );
            $user->refresh();
        }

        if ($roleIntent === 'resort_owner') {
            $this->ownerOnboarding->onboardOwner($user, [
                'business_name' => $businessName !== '' ? $businessName : null,
                'is_publicly_listed' => false,
            ]);
            $user->refresh();
        }

        $this->emailNotifications->sendTermsAccepted($user, 'account registration');

        $token = $user->createToken('spa-token')->plainTextToken;

        return $this->successResponse([
            'user' => UserProfilePresenter::toArray($user),
            'token' => $token,
            ...$referralTrialPayload,
        ], 'Account created', 201);
    }

    public function login(Request $request)
    {
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Case-insensitive match (handles legacy rows) and consistent with normalized registration email.
        $user = User::query()
            ->whereRaw('lower(email) = ?', [$validated['email']])
            ->first();

        if (! $user) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $hash = $user->getAuthPassword();
        if ($hash === '' || $hash === null) {
            throw ValidationException::withMessages([
                'email' => ['This account has no password set. Sign in with Google or use Forgot password if available.'],
            ]);
        }

        if (! Hash::check($validated['password'], $hash)) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        return $this->successResponse(['user' => UserProfilePresenter::toArray($user), 'token' => $token], 'Authenticated');
    }

    public function forgotPasswordRequest(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);
        $email = mb_strtolower(trim($validated['email']));
        $result = $this->passwordResetOtpService->sendForEmail($email);

        if (! ($result['ok'] ?? false)) {
            return $this->errorResponse($result['message'] ?? 'Unable to send reset code.', null, 422);
        }

        return $this->successResponse(
            [
                'expires_at' => $result['expires_at'] ?? null,
                'cooldown_seconds' => $result['cooldown_seconds'] ?? null,
            ],
            $result['message'] ?? 'Check your email for a reset code.'
        );
    }

    public function forgotPasswordReset(Request $request)
    {
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
            'password' => PlatformPasswordRules::requiredWithConfirmation(),
        ]);

        $result = $this->passwordResetOtpService->verifyAndResetPassword(
            $validated['email'],
            (string) $validated['otp'],
            (string) $validated['password'],
        );

        if (! ($result['ok'] ?? false)) {
            throw ValidationException::withMessages([
                'otp' => [$result['message'] ?? 'Reset failed.'],
            ]);
        }

        return $this->successResponse(null, $result['message'] ?? 'Password updated.');
    }

    public function marketingGovIdOptions()
    {
        return $this->successResponse(MarketingGovIdCatalog::options(), 'Government ID options');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $this->errorResponse('Unauthorized.', null, 401);
        }

        return $this->successResponse(UserProfilePresenter::toArray($user), 'Current user');
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->successResponse(null, 'Logged out');
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email:rfc', 'max:190', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $gcashPayload = [];
        if ($user->role === 'marketing' && $request->hasAny(['gcash_account_number', 'gcash_account_holder_name'])) {
            $gcashIn = $request->validate([
                'gcash_account_number' => ['nullable', 'string', 'max:32'],
                'gcash_account_holder_name' => ['nullable', 'string', 'max:120'],
            ]);
            $rawNum = trim((string) ($gcashIn['gcash_account_number'] ?? ''));
            $holderRaw = trim((string) ($gcashIn['gcash_account_holder_name'] ?? ''));

            if ($rawNum !== '' && $holderRaw === '') {
                throw ValidationException::withMessages([
                    'gcash_account_holder_name' => ['Enter the account holder name registered on GCash.'],
                ]);
            }

            if ($rawNum === '' && $holderRaw !== '') {
                if (! filled($user->gcash_account_number)) {
                    throw ValidationException::withMessages([
                        'gcash_account_number' => ['Add your GCash mobile number first.'],
                    ]);
                }
                $holder = GcashAccountNormalizer::normalizeHolderName($holderRaw);
                if (strlen($holder) < 2) {
                    throw ValidationException::withMessages([
                        'gcash_account_holder_name' => ['Enter the full name registered on the GCash wallet.'],
                    ]);
                }
                if (! preg_match('/^[\p{L}\p{M}\s\-\'\.]+$/u', $holder)) {
                    throw ValidationException::withMessages([
                        'gcash_account_holder_name' => ['Use letters and spaces only for the account name.'],
                    ]);
                }
                $gcashPayload['gcash_account_holder_name'] = $holder;
            }

            if ($rawNum !== '' && $holderRaw !== '') {
                $norm = GcashAccountNormalizer::normalizeMobile($rawNum);
                if (! $norm['ok']) {
                    throw ValidationException::withMessages([
                        'gcash_account_number' => [$norm['error'] ?? 'Invalid number.'],
                    ]);
                }
                $holder = GcashAccountNormalizer::normalizeHolderName($holderRaw);
                if (strlen($holder) < 2) {
                    throw ValidationException::withMessages([
                        'gcash_account_holder_name' => ['Enter the full name registered on the GCash wallet.'],
                    ]);
                }
                if (! preg_match('/^[\p{L}\p{M}\s\-\'\.]+$/u', $holder)) {
                    throw ValidationException::withMessages([
                        'gcash_account_holder_name' => ['Use letters and spaces only for the account name.'],
                    ]);
                }
                $gcashPayload = [
                    'gcash_account_number' => $norm['normalized'],
                    'gcash_account_holder_name' => $holder,
                ];
            }
        }

        $govPayload = [];
        if ($user->role === 'marketing' && $request->hasAny(['marketer_gov_id_type', 'marketer_gov_id_number'])) {
            $govIn = $request->validate([
                'marketer_gov_id_type' => ['nullable', 'string', 'max:40', Rule::in(MarketingGovIdCatalog::slugs())],
                'marketer_gov_id_number' => ['nullable', 'string', 'max:80', 'regex:/^[\p{L}\p{N}\s\-\.\/]+$/u'],
            ]);
            $type = isset($govIn['marketer_gov_id_type']) ? trim((string) $govIn['marketer_gov_id_type']) : '';
            $numRaw = isset($govIn['marketer_gov_id_number']) ? trim((string) $govIn['marketer_gov_id_number']) : '';

            if ($type === '' && $numRaw !== '') {
                throw ValidationException::withMessages([
                    'marketer_gov_id_type' => ['Select the ID type first.'],
                ]);
            }

            if ($type !== '' && $numRaw === '') {
                throw ValidationException::withMessages([
                    'marketer_gov_id_number' => ['Enter the ID number as shown on your document.'],
                ]);
            }

            if ($type !== '' && $numRaw !== '') {
                if (($user->marketer_gov_id_type ?? null) !== null && ($user->marketer_gov_id_type ?? null) !== $type) {
                    $this->deleteStoredMarketingGovIdDocument($user);
                    $govPayload['marketer_gov_id_document_url'] = null;
                }
                $govPayload['marketer_gov_id_type'] = $type;
                $govPayload['marketer_gov_id_number'] = preg_replace('/\s+/', ' ', $numRaw) ?? $numRaw;
            }
        }

        $kycPayload = [];
        if ($user->role === 'marketing' && $request->hasAny([
            'mailing_province_psgc',
            'mailing_city_municipality_psgc',
            'mailing_barangay_psgc',
            'mailing_barangay_name',
            'mailing_location_label',
            'marketer_tin',
            'marketer_bank_name',
            'marketer_bank_branch',
            'marketer_bank_account_name',
            'marketer_bank_account_number',
        ])) {
            $kycIn = $request->validate([
                'mailing_province_psgc' => ['nullable', 'string', 'max:12'],
                'mailing_city_municipality_psgc' => ['nullable', 'string', 'max:12'],
                'mailing_barangay_psgc' => ['nullable', 'string', 'max:12'],
                'mailing_barangay_name' => ['nullable', 'string', 'max:180'],
                'mailing_location_label' => ['nullable', 'string', 'max:512'],
                'marketer_tin' => ['nullable', 'string', 'max:32'],
                'marketer_bank_name' => ['nullable', 'string', 'max:120'],
                'marketer_bank_branch' => ['nullable', 'string', 'max:120'],
                'marketer_bank_account_name' => ['nullable', 'string', 'max:120'],
                'marketer_bank_account_number' => ['nullable', 'string', 'max:64'],
            ]);

            $finalP = array_key_exists('mailing_province_psgc', $kycIn)
                ? (filled($kycIn['mailing_province_psgc']) ? trim((string) $kycIn['mailing_province_psgc']) : null)
                : $user->mailing_province_psgc;
            $finalC = array_key_exists('mailing_city_municipality_psgc', $kycIn)
                ? (filled($kycIn['mailing_city_municipality_psgc']) ? trim((string) $kycIn['mailing_city_municipality_psgc']) : null)
                : $user->mailing_city_municipality_psgc;
            $finalBn = array_key_exists('mailing_barangay_name', $kycIn)
                ? (filled($kycIn['mailing_barangay_name']) ? trim((string) $kycIn['mailing_barangay_name']) : null)
                : $user->mailing_barangay_name;
            $finalB = array_key_exists('mailing_barangay_psgc', $kycIn)
                ? (filled($kycIn['mailing_barangay_psgc']) ? trim((string) $kycIn['mailing_barangay_psgc']) : null)
                : $user->mailing_barangay_psgc;

            $this->locations->assertValidPhilippineLocationOrEmpty(
                $finalP,
                $finalC,
                $finalBn,
                $finalB,
                ['mailing_province_psgc', 'mailing_city_municipality_psgc', 'mailing_barangay_name', 'mailing_barangay_psgc'],
            );

            if (array_key_exists('mailing_province_psgc', $kycIn)) {
                $kycPayload['mailing_province_psgc'] = $finalP;
            }
            if (array_key_exists('mailing_city_municipality_psgc', $kycIn)) {
                $kycPayload['mailing_city_municipality_psgc'] = $finalC;
            }
            if (array_key_exists('mailing_barangay_name', $kycIn)) {
                $kycPayload['mailing_barangay_name'] = $finalBn;
            }
            if (array_key_exists('mailing_barangay_psgc', $kycIn)) {
                $kycPayload['mailing_barangay_psgc'] = $finalB;
            }
            if (array_key_exists('mailing_location_label', $kycIn)) {
                $lab = trim((string) ($kycIn['mailing_location_label'] ?? ''));
                $kycPayload['mailing_location_label'] = $lab === '' ? null : $lab;
            }

            if (array_key_exists('marketer_tin', $kycIn)) {
                $tinRaw = trim((string) ($kycIn['marketer_tin'] ?? ''));
                if ($tinRaw === '') {
                    $kycPayload['marketer_tin'] = null;
                } else {
                    $digits = preg_replace('/\D+/', '', $tinRaw) ?? '';
                    if ($digits === '' || strlen($digits) < 9 || strlen($digits) > 12) {
                        throw ValidationException::withMessages([
                            'marketer_tin' => ['Enter a valid BIR TIN (9–12 digits).'],
                        ]);
                    }
                    $kycPayload['marketer_tin'] = $digits;
                }
            }

            $bn = trim((string) ($kycIn['marketer_bank_name'] ?? ''));
            $bb = trim((string) ($kycIn['marketer_bank_branch'] ?? ''));
            $ban = trim((string) ($kycIn['marketer_bank_account_name'] ?? ''));
            $bac = trim((string) ($kycIn['marketer_bank_account_number'] ?? ''));
            $anyBank = $bn !== '' || $bb !== '' || $ban !== '' || $bac !== '';

            if ($anyBank) {
                if ($bn === '' || $ban === '' || $bac === '') {
                    throw ValidationException::withMessages([
                        'marketer_bank_account_number' => ['Bank name, account holder name, and account number are required together.'],
                    ]);
                }
                $holder = GcashAccountNormalizer::normalizeHolderName($ban);
                if (strlen($holder) < 2) {
                    throw ValidationException::withMessages([
                        'marketer_bank_account_name' => ['Enter the full name on the bank account.'],
                    ]);
                }
                if (! preg_match('/^[\p{L}\p{M}\s\-\'\.]+$/u', $holder)) {
                    throw ValidationException::withMessages([
                        'marketer_bank_account_name' => ['Use letters and spaces only for the account name.'],
                    ]);
                }
                $acct = preg_replace('/\s+/', '', $bac) ?? $bac;
                if ($acct === '' || strlen($acct) < 4) {
                    throw ValidationException::withMessages([
                        'marketer_bank_account_number' => ['Enter a valid account number.'],
                    ]);
                }
                if (! preg_match('/^[\p{L}\p{N}\-]+$/u', $acct)) {
                    throw ValidationException::withMessages([
                        'marketer_bank_account_number' => ['Use only letters, numbers, and hyphens.'],
                    ]);
                }
                $kycPayload['marketer_bank_name'] = $bn;
                $kycPayload['marketer_bank_branch'] = $bb === '' ? null : $bb;
                $kycPayload['marketer_bank_account_name'] = $holder;
                $kycPayload['marketer_bank_account_number'] = $acct;
            } elseif (array_key_exists('marketer_bank_name', $kycIn)
                || array_key_exists('marketer_bank_branch', $kycIn)
                || array_key_exists('marketer_bank_account_name', $kycIn)
                || array_key_exists('marketer_bank_account_number', $kycIn)) {
                $kycPayload['marketer_bank_name'] = null;
                $kycPayload['marketer_bank_branch'] = null;
                $kycPayload['marketer_bank_account_name'] = null;
                $kycPayload['marketer_bank_account_number'] = null;
            }
        }

        $user->update([...$validated, ...$gcashPayload, ...$govPayload, ...$kycPayload]);

        if ($user->role === 'marketing') {
            $this->locations->syncUserMailingLabel($user->fresh());
        }

        return $this->successResponse(UserProfilePresenter::toArray($user->fresh()), 'Profile updated');
    }

    public function uploadMarketingGovIdDocument(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'marketing') {
            return $this->errorResponse('Only marketing partners may upload this document.', null, 403);
        }

        $request->validate([
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        if (! filled($user->marketer_gov_id_type) || ! filled($user->marketer_gov_id_number)) {
            return $this->errorResponse('Save your ID type and ID number before uploading a scan or photo.', null, 422);
        }

        $this->deleteStoredMarketingGovIdDocument($user);

        $disk = StoredMedia::disk();
        $path = $request->file('document')->store('marketing_gov_ids/'.$user->id, $disk);
        $user->update(['marketer_gov_id_document_url' => StoredMedia::publicUrlForPath($path)]);

        return $this->successResponse([
            'user' => UserProfilePresenter::toArray($user->fresh()),
        ], 'ID document uploaded');
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => PlatformPasswordRules::requiredWithConfirmation(),
        ]);

        if (! Hash::check($validated['current_password'], $user->getAuthPassword())) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        // Assign plaintext — User model uses `password` => `hashed` cast (single bcrypt layer).
        $user->forceFill(['password' => $validated['password']])->save();

        // Revoke all other tokens so existing sessions are invalidated after a password change.
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return $this->successResponse(null, 'Password changed successfully');
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            // Allow avatars up to ~8 MB
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ]);

        $user = $request->user();

        StoredMedia::deleteIfPresent($user->avatar_url);

        $disk = StoredMedia::disk();
        $path = $request->file('avatar')->store('avatars', $disk);
        $user->update(['avatar_url' => StoredMedia::publicUrlForPath($path)]);

        return $this->successResponse(['avatar_url' => $user->avatar_url], 'Avatar updated');
    }

    public function sendEmailVerificationOtp(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $this->errorResponse('Unauthorized.', null, 401);
        }

        if (! in_array($user->role, ['resort_owner', 'marketing'], true)) {
            return $this->errorResponse('OTP verification is only required for resort owners and marketing partners.', null, 403);
        }

        if ($user->email_verified_at) {
            return $this->successResponse(['already_verified' => true], 'Email already verified.');
        }

        $result = $this->emailOtpService->send($user);
        if (! ($result['ok'] ?? false)) {
            return $this->errorResponse($result['message'] ?? 'Failed to send verification code.', null, 422);
        }

        return $this->successResponse([
            'expires_at' => $result['expires_at'] ?? null,
            'cooldown_seconds' => $result['cooldown_seconds'] ?? null,
        ], $result['message'] ?? 'Verification code sent.');
    }

    public function verifyEmailVerificationOtp(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $this->errorResponse('Unauthorized.', null, 401);
        }

        if (! in_array($user->role, ['resort_owner', 'marketing'], true)) {
            return $this->errorResponse('OTP verification is only required for resort owners and marketing partners.', null, 403);
        }

        $validated = $request->validate([
            'otp' => ['required', 'digits:6'],
        ]);

        $result = $this->emailOtpService->verify($user, (string) $validated['otp']);
        if (! ($result['ok'] ?? false)) {
            return $this->errorResponse($result['message'] ?? 'Verification failed.', null, 422);
        }

        return $this->successResponse([
            'user' => UserProfilePresenter::toArray($user->fresh()),
        ], $result['message'] ?? 'Email verified successfully.');
    }

    private function deleteStoredMarketingGovIdDocument(User $user): void
    {
        StoredMedia::deleteIfPresent($user->marketer_gov_id_document_url);
    }
}
