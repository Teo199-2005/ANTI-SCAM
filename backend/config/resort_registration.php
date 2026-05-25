<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Resort owner registration wizard
    |--------------------------------------------------------------------------
    |
    | When enabled, new resort owners receive a draft only at signup and must
    | complete the dashboard wizard before a tenant/resort is created. When
    | disabled, legacy immediate onboarding via ResortOwnerOnboardingService applies.
    |
    */
    'wizard_enabled' => filter_var(env('REGISTRATION_WIZARD_ENABLED', true), FILTER_VALIDATE_BOOL),

];
