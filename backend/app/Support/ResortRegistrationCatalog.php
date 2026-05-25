<?php

declare(strict_types=1);

namespace App\Support;

final class ResortRegistrationCatalog
{
    /** @return list<string> */
    public static function hospitalityTypes(): array
    {
        return [
            'hotel',
            'resort',
            'staycation',
            'villa',
            'condotel',
            'beach_resort',
            'campsite',
            'other',
        ];
    }

    /** @return array{general: list<string>, resort: list<string>, guest: list<string>, commercial: list<string>, parking: list<string>} */
    public static function amenityGroups(): array
    {
        return [
            'general' => ['airconditioned', 'tv', 'netflix', 'refrigerator', 'heater', 'wifi', 'cctv', 'pet_allowed'],
            'resort' => ['private_pool', 'public_pool', 'jacuzzi', 'beach_access', 'billiards', 'basketball_court', 'videoke'],
            'guest' => ['soap', 'shampoo', 'breakfast'],
            'commercial' => ['restaurant', 'store'],
            'parking' => ['parking'],
        ];
    }

    /** @return list<string> */
    public static function verificationDocumentTypes(): array
    {
        return ['government_id', 'property_tour', 'ownership_proof'];
    }

    /** @return list<string> */
    public static function verificationMethods(): array
    {
        return ['video', 'site_visit', 'hybrid'];
    }
}
