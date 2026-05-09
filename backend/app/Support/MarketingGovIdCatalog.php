<?php

namespace App\Support;

/**
 * Valid government / primary ID options for marketing partner verification (Philippines-focused).
 *
 * @return list<array{slug: string, label: string, placeholder: string, format_hint: string}>
 */
final class MarketingGovIdCatalog
{
    public static function options(): array
    {
        return [
            [
                'slug' => 'philsys',
                'label' => 'PhilSys / National ID (ePhilID)',
                'placeholder' => '1234 5678 9012 3456',
                'format_hint' => 'Typically 16 digits. Enter numbers only or with spaces as shown on the card.',
            ],
            [
                'slug' => 'passport',
                'label' => 'Passport',
                'placeholder' => 'P1234567A',
                'format_hint' => 'Philippine passport number: letter + 7 digits + letter (example). Use exactly as printed.',
            ],
            [
                'slug' => 'drivers_license',
                'label' => "Driver's license (LTO)",
                'placeholder' => 'A12-34-567890',
                'format_hint' => 'Alphanumeric; format varies by region. Match the number on the front of your license.',
            ],
            [
                'slug' => 'umid',
                'label' => 'UMID (SSS / GSIS)',
                'placeholder' => '123456789012',
                'format_hint' => 'Usually 12 digits on the UMID card.',
            ],
            [
                'slug' => 'sss',
                'label' => 'SSS ID / SSS number',
                'placeholder' => '34-1234567-8',
                'format_hint' => 'SSS number format: two digits, hyphen, seven digits, hyphen, one check digit.',
            ],
            [
                'slug' => 'tin',
                'label' => 'TIN (BIR)',
                'placeholder' => '123-456-789-000',
                'format_hint' => 'Tax Identification Number as issued by BIR (digits with optional hyphens).',
            ],
            [
                'slug' => 'postal',
                'label' => 'Postal ID',
                'placeholder' => '1234 5678 9012',
                'format_hint' => 'Numeric ID as shown on your Postal ID.',
            ],
            [
                'slug' => 'voters',
                'label' => "Voter's ID / Comelec",
                'placeholder' => 'ABC1234567DEF',
                'format_hint' => 'Use the voter identification number exactly as on your Comelec document.',
            ],
            [
                'slug' => 'prc',
                'label' => 'PRC ID (professional)',
                'placeholder' => '0012345',
                'format_hint' => 'Professional Regulation Commission license number.',
            ],
            [
                'slug' => 'philhealth',
                'label' => 'PhilHealth ID',
                'placeholder' => '12-345678901-2',
                'format_hint' => 'PhilHealth identification number (digits with hyphens as on card).',
            ],
            [
                'slug' => 'other',
                'label' => 'Other valid government-issued ID',
                'placeholder' => 'ID number as shown',
                'format_hint' => 'Enter the ID number exactly as printed. Admin may request clarification.',
            ],
        ];
    }

    /** @return list<string> */
    public static function slugs(): array
    {
        return array_values(array_map(static fn (array $o): string => $o['slug'], self::options()));
    }

    public static function find(string $slug): ?array
    {
        foreach (self::options() as $o) {
            if ($o['slug'] === $slug) {
                return $o;
            }
        }

        return null;
    }
}
