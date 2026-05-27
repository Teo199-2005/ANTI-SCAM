<?php

namespace App\Http\Controllers;

use App\Mail\OnboardingMailable;
use App\Models\Resort;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class OnboardingMailerController extends Controller
{
    public function send(Request $request, Resort $resort)
    {
        $this->authorize('view', $resort);

        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

    Mail::to($data['email'])->queue(new OnboardingMailable($resort->name ?? ''));

    return response()->json(['success' => true, 'message' => 'Onboarding email queued for delivery.']);
    }
}
