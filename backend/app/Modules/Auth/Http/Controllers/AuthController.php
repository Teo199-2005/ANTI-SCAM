<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Legal\PlatformTerms;
use App\Models\Resort;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EmailNotificationService;
use App\Services\EmailVerificationOtpService;
use App\Services\GooglePendingSignupService;
use App\Services\PasswordResetOtpService;
use App\Services\ResortRegistrationService;
use App\Services\PhilippineLocationService;
use App\Services\ReferralSignupTrialService;
use App\Services\ResortOwnerOnboardingService;
use App\Shared\Traits\ApiResponseTrait;
use App\Modules\Billing\Services\PhilippinesPayoutBankChannelService;
use App\Support\BankAccountNormalizer;
use App\Support\MarketingGovIdCatalog;
use App\Support\PlatformPasswordRules;
use App\Support\ResortRegistrationConfig;
use App\Support\StoredMedia;
use App\Support\UserProfilePresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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
        private readonly PhilippinesPayoutBankChannelService $payoutBanks,
        private readonly GooglePendingSignupService $googlePendingSignup,
        private readonly ResortRegistrationService $resortRegistration,
    ) {}

    public function googlePendingSignup(Request $request)
    {
        $validated = $request->validate([
            'google_token' => ['required', 'string', 'min:32', 'max:128'],
        ]);

        $pending = $this->googlePendingSignup->peek($validated['google_token']);
        if ($pending === null) {
            return $this->errorResponse('This Google sign-up link expired. Try Continue with Google again.', null, 410);
        }

        return $this->successResponse([
            'email' => $pending['email'],
            'name' => $pending['name'],
        ]);
    }

    public function completeGoogleSignup(Request $request)
    {
        $validated = $request->validate([
            'google_token' => ['required', 'string', 'min:32', 'max:128'],
            'role_intent' => ['required', 'in:resort_owner,client'],
            'accept_terms' => ['required', 'accepted'],
            'phone' => ['nullable', 'string', 'max:30'],
            'business_name' => ['nullable', 'string', 'max:190'],
            'referral_code' => ['nullable', 'string', 'max:32'],
        ]);

        $pending = $this->googlePendingSignup->consume($validated['google_token']);
        if ($pending === null) {
            return $this->errorResponse('This Google sign-up link expired. Try Continue with Google again.', null, 410);
        }

        if (User::query()->where('email', $pending['email'])->orWhere('google_id', $pending['google_id'])->exists()) {
            return $this->errorResponse('An account with this email already exists. Sign in instead.', null, 409);
        }

        $roleIntent = $validated['role_intent'];

        $user = User::create([
            'name' => $pending['name'],
            'email' => $pending['email'],
            'google_id' => $pending['google_id'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make(Str::random(48)),
            'role' => $roleIntent,
            'email_verified_at' => now(),
            'terms_accepted_at' => now(),
            'terms_version' => PlatformTerms::version(),
        ]);

        $referralTrialPayload = ['referral_trial' => $this->referralSignupTrial->trialPayloadForUser($user)];
        $referralCode = trim((string) ($validated['referral_code'] ?? ''));
        $businessName = isset($validated['business_name']) ? trim((string) $validated['business_name']) : null;

        if ($roleIntent === 'resort_owner') {
            $this->bootstrapResortOwnerSignup($user, $referralCode, $businessName);
        }

        $this->emailNotifications->sendTermsAccepted($user, 'Google account registration');

        $token = $user->createToken('spa-token')->plainTextToken;

        return $this->successResponse([
            'user' => UserProfilePresenter::toArray($user),
            'token' => $token,
            ...$referralTrialPayload,
        ], 'Account created', 201);
    }

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
            'role_intent' => ['nullable', 'in:resort_owner,client'],
            'signup_source_resort_id' => ['nullable', 'integer', 'exists:resorts,id'],
            'accept_terms' => ['required', 'accepted'],
            'password' => PlatformPasswordRules::requiredWithConfirmation(),
            'referral_code' => ['nullable', 'string', 'max:32'],
        ]);

        if ($request->input('role_intent') === 'guest' || $request->filled('resort_subdomain')) {
            throw ValidationException::withMessages([
                'role_intent' => ['Guest accounts are no longer created. Register as a client to book any resort.'],
            ]);
        }

        $roleIntent = $validated['role_intent'] ?? 'resort_owner';

        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $roleIntent,
            'terms_accepted_at' => now(),
            'terms_version' => PlatformTerms::version(),
        ];

        $user = User::create($payload);

        $referralTrialPayload = ['referral_trial' => $this->referralSignupTrial->trialPayloadForUser($user)];
        $referralCode = trim((string) ($validated['referral_code'] ?? ''));
        $businessName = isset($validated['business_name']) ? trim((string) $validated['business_name']) : null;

        if ($roleIntent === 'resort_owner') {
            $this->bootstrapResortOwnerSignup($user, $referralCode, $businessName);
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

        if ($request->has('email')) {
            $request->merge([
                'email' => mb_strtolower(trim((string) $request->input('email', ''))),
            ]);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email:rfc', 'max:190', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $emailChanged = array_key_exists('email', $validated)
            && mb_strtolower((string) $validated['email']) !== mb_strtolower((string) $user->email);

        if ($emailChanged) {
            // A changed login email must be re-verified with a fresh OTP.
            $validated['email_verified_at'] = null;
        }

        if ($user->role === 'marketing' && $request->hasAny(['gcash_account_number', 'gcash_account_holder_name'])) {
            throw ValidationException::withMessages([
                'gcash_account_number' => ['GCash payouts are no longer supported. Add your bank account under payout details instead.'],
            ]);
        }

        $bankPayoutPayload = [];
        if ($user->role === 'marketing' && $request->hasAny([
            'marketer_bank_channel_code',
            'marketer_bank_account_name',
            'marketer_bank_account_number',
            'marketer_bank_branch',
        ])) {
            $bankIn = $request->validate([
                'marketer_bank_channel_code' => ['nullable', 'string', 'max:32'],
                'marketer_bank_account_name' => ['nullable', 'string', 'max:120'],
                'marketer_bank_account_number' => ['nullable', 'string', 'max:64'],
                'marketer_bank_branch' => ['nullable', 'string', 'max:120'],
            ]);

            $channel = trim((string) ($bankIn['marketer_bank_channel_code'] ?? ''));
            $holderRaw = trim((string) ($bankIn['marketer_bank_account_name'] ?? ''));
            $acctRaw = trim((string) ($bankIn['marketer_bank_account_number'] ?? ''));
            $branch = trim((string) ($bankIn['marketer_bank_branch'] ?? ''));
            $any = $channel !== '' || $holderRaw !== '' || $acctRaw !== '' || $branch !== '';

            if ($any) {
                if ($channel === '' || $holderRaw === '' || $acctRaw === '') {
                    throw ValidationException::withMessages([
                        'marketer_bank_account_number' => ['Select a bank, account holder name, and account number together.'],
                    ]);
                }

                try {
                    $this->payoutBanks->assertChannelCodeAllowed($channel);
                } catch (\RuntimeException $e) {
                    throw ValidationException::withMessages([
                        'marketer_bank_channel_code' => [$e->getMessage()],
                    ]);
                }

                $holder = BankAccountNormalizer::normalizeHolderName($holderRaw);
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

                $acct = BankAccountNormalizer::normalizeAccountNumber($acctRaw);
                if (! $acct['ok']) {
                    throw ValidationException::withMessages([
                        'marketer_bank_account_number' => [$acct['error'] ?? 'Invalid account number.'],
                    ]);
                }

                $bankPayoutPayload = [
                    'marketer_bank_channel_code' => $channel,
                    'marketer_bank_name' => $this->payoutBanks->labelForChannelCode($channel) ?? $channel,
                    'marketer_bank_account_name' => $holder,
                    'marketer_bank_account_number' => $acct['normalized'],
                    'marketer_bank_branch' => $branch === '' ? null : $branch,
                ];
            } elseif (array_key_exists('marketer_bank_channel_code', $bankIn)
                || array_key_exists('marketer_bank_account_name', $bankIn)
                || array_key_exists('marketer_bank_account_number', $bankIn)
                || array_key_exists('marketer_bank_branch', $bankIn)) {
                $bankPayoutPayload = [
                    'marketer_bank_channel_code' => null,
                    'marketer_bank_name' => null,
                    'marketer_bank_branch' => null,
                    'marketer_bank_account_name' => null,
                    'marketer_bank_account_number' => null,
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
        ])) {
            $kycIn = $request->validate([
                'mailing_province_psgc' => ['nullable', 'string', 'max:12'],
                'mailing_city_municipality_psgc' => ['nullable', 'string', 'max:12'],
                'mailing_barangay_psgc' => ['nullable', 'string', 'max:12'],
                'mailing_barangay_name' => ['nullable', 'string', 'max:180'],
                'mailing_location_label' => ['nullable', 'string', 'max:512'],
                'marketer_tin' => ['nullable', 'string', 'max:32'],
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

            $anyLoc = array_key_exists('mailing_province_psgc', $kycIn)
                || array_key_exists('mailing_city_municipality_psgc', $kycIn)
                || array_key_exists('mailing_barangay_name', $kycIn)
                || array_key_exists('mailing_barangay_psgc', $kycIn);

            if ($anyLoc && filled($finalP) && filled($finalC)) {
                $finalP = $this->locations->canonicalProvinceCodeForMailing($finalP, $finalC);
            }

            if (array_key_exists('mailing_province_psgc', $kycIn) || ($anyLoc && filled($finalP) && filled($finalC))) {
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

        }

        $responseMessage = 'Profile updated';
        DB::transaction(function () use (
            $user,
            $validated,
            $bankPayoutPayload,
            $govPayload,
            $kycPayload,
            $emailChanged,
            &$responseMessage,
        ): void {
            $user->update([...$validated, ...$bankPayoutPayload, ...$govPayload, ...$kycPayload]);

            if (! $emailChanged || ! $this->requiresOtpEmailVerification($user)) {
                return;
            }

            $freshUser = $user->fresh();
            if (! $freshUser) {
                throw ValidationException::withMessages([
                    'email' => ['Unable to finalize your email update. Please try again.'],
                ]);
            }

            $otpResult = $this->emailOtpService->send($freshUser);
            if (! ($otpResult['ok'] ?? false)) {
                throw ValidationException::withMessages([
                    'email' => [$otpResult['message'] ?? 'We could not send the verification code to your new email.'],
                ]);
            }

            $responseMessage = $otpResult['message'] ?? 'Profile updated. Verification code sent to your new email.';
        });

        if ($user->role === 'marketing') {
            $this->locations->syncUserMailingLabel($user->fresh());
        }

        return $this->successResponse(UserProfilePresenter::toArray($user->fresh()), $responseMessage);
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

    private function bootstrapResortOwnerSignup(User $user, string $referralCode, ?string $businessName): void
    {
        $businessName = $businessName !== null ? trim($businessName) : '';

        if (! ResortRegistrationConfig::wizardEnabled()) {
            $this->ownerOnboarding->onboardOwner($user, [
                'business_name' => $businessName !== '' ? $businessName : null,
                'is_publicly_listed' => false,
            ]);
            $user->refresh();
            if ($referralCode !== '') {
                $this->referralSignupTrial->redeemAtRegistration(
                    $user,
                    $referralCode,
                    $businessName !== '' ? $businessName : null,
                );
            }

            return;
        }

        $seed = [];
        if ($referralCode !== '') {
            $seed['step2'] = ['referral_code' => $referralCode];
        }
        if ($businessName !== '') {
            $seed['step2'] = array_merge($seed['step2'] ?? [], ['business_name' => $businessName]);
        }
        $this->resortRegistration->ensureDraftForOwner($user, $seed);
        $user->forceFill(['onboarding_step' => 1])->save();
    }

    private function deleteStoredMarketingGovIdDocument(User $user): void
    {
        StoredMedia::deleteIfPresent($user->marketer_gov_id_document_url);
    }

    private function requiresOtpEmailVerification(User $user): bool
    {
        return in_array($user->role, ['resort_owner', 'marketing'], true);
    }
}
