<?php

namespace App\Modules\Billing\Services;

use App\Modules\Billing\Support\XenditTls;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PhilippinesPayoutBankChannelService
{
    private const CACHE_KEY = 'xendit:payout_channels:php:bank';

    public function __construct(
        private readonly XenditPayoutService $xenditPayout,
    ) {}

    /**
     * @return list<array{channel_code: string, name: string}>
     */
    public function listBanks(): array
    {
        $ttl = max(60, (int) config('services.marketing_payout.bank_channels_cache_seconds', 86400));

        return Cache::remember(self::CACHE_KEY, $ttl, function (): array {
            return $this->fetchFromXendit();
        });
    }

    /** @return list<string> */
    public function allowedChannelCodes(): array
    {
        return array_values(array_map(
            fn (array $row): string => (string) $row['channel_code'],
            $this->listBanks(),
        ));
    }

    public function labelForChannelCode(string $channelCode): ?string
    {
        foreach ($this->listBanks() as $row) {
            if (($row['channel_code'] ?? '') === $channelCode) {
                return (string) ($row['name'] ?? $channelCode);
            }
        }

        return null;
    }

    public function assertChannelCodeAllowed(string $channelCode): void
    {
        $code = trim($channelCode);
        if ($code === '') {
            throw new RuntimeException('Bank channel is required.');
        }

        $allowed = $this->allowedChannelCodes();
        if ($allowed === []) {
            throw new RuntimeException('Bank list is temporarily unavailable. Try again shortly.');
        }

        if (! in_array($code, $allowed, true)) {
            throw new RuntimeException('Selected bank is not supported for payouts.');
        }
    }

    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return list<array{channel_code: string, name: string}>
     */
    private function fetchFromXendit(): array
    {
        if (! $this->xenditPayout->isConfigured()) {
            return $this->fallbackFromStaleCache();
        }

        $secret = (string) config('services.xendit.secret_key');
        $url = 'https://api.xendit.co/payouts_channels?'.http_build_query([
            'currency' => 'PHP',
            'channel_category' => 'BANK',
        ]);

        try {
            $response = Http::withBasicAuth($secret, '')
                ->withHeaders(['Content-Type' => 'application/json'])
                ->withOptions(XenditTls::httpClientOptions())
                ->timeout(30)
                ->get($url);
        } catch (ConnectionException $e) {
            Log::warning('Xendit payout channels fetch failed', ['error' => $e->getMessage()]);

            return $this->fallbackFromStaleCache();
        }

        if (! $response->successful()) {
            Log::warning('Xendit payout channels non-success', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return $this->fallbackFromStaleCache();
        }

        $parsed = $this->parseChannelsResponse($response->json());
        if ($parsed !== []) {
            Cache::put(self::CACHE_KEY.':stale', $parsed, now()->addDays(7));
        }

        return $parsed;
    }

    /**
     * @return list<array{channel_code: string, name: string}>
     */
    private function parseChannelsResponse(mixed $body): array
    {
        $rows = [];
        if (! is_array($body)) {
            return [];
        }

        $items = $body;
        if (isset($body['data']) && is_array($body['data'])) {
            $items = $body['data'];
        }

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $code = (string) ($item['channel_code'] ?? $item['code'] ?? '');
            if ($code === '' || ! str_starts_with($code, 'PH_')) {
                continue;
            }
            $category = strtoupper((string) ($item['channel_category'] ?? $item['category'] ?? ''));
            if ($category !== '' && $category !== 'BANK') {
                continue;
            }
            $name = (string) ($item['channel_name'] ?? $item['name'] ?? $item['bank_name'] ?? $code);
            $rows[] = ['channel_code' => $code, 'name' => $name];
        }

        usort($rows, fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

        return $rows;
    }

    /**
     * @return list<array{channel_code: string, name: string}>
     */
    private function fallbackFromStaleCache(): array
    {
        $stale = Cache::get(self::CACHE_KEY.':stale');

        return is_array($stale) ? $stale : [];
    }
}
