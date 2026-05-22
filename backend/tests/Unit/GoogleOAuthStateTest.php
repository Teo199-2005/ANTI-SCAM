<?php

namespace Tests\Unit;

use App\Support\GoogleOAuthState;
use Tests\TestCase;

class GoogleOAuthStateTest extends TestCase
{
    public function test_round_trip_encodes_frontend_and_return_path(): void
    {
        $state = GoogleOAuthState::encode('/dashboard/client', 'https://anti-scamph.com');
        $decoded = GoogleOAuthState::decode($state);

        $this->assertNotNull($decoded);
        $this->assertSame('/dashboard/client', $decoded['return_to']);
        $this->assertSame('https://anti-scamph.com', $decoded['frontend']);
    }
}
