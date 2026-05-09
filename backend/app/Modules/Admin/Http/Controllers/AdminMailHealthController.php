<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\MailHealthService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class AdminMailHealthController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly MailHealthService $mailHealth) {}

    public function send(Request $request)
    {
        $data = $request->validate([
            'to_email' => ['required', 'email:rfc,dns', 'max:190'],
        ]);

        $result = $this->mailHealth->sendTestEmail((string) $data['to_email'], null, 'admin_api');

        if (! $result['ok']) {
            return $this->errorResponse($result['message'], ['email_log_id' => [$result['log_id']]], 502);
        }

        return $this->successResponse([
            'email_log_id' => $result['log_id'],
        ], 'Test email sent');
    }
}

