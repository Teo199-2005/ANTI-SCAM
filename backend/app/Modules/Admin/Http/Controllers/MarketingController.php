<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionRelease;
use App\Models\MarketerPayoutBatch;
use App\Models\Resort;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly AuditLogService $audits) {}

    /** List all marketers with their assigned resort count. */
    public function marketers()
    {
        $marketers = User::where('role', 'marketing')
            ->withCount('assignedResorts')
            ->latest()
            ->paginate(20);

        return $this->successResponse($marketers, 'Marketers fetched');
    }

    /** Assign a resort to a marketer. */
    public function assign(Request $request)
    {
        $data = $request->validate([
            'marketer_id' => ['required', 'exists:users,id'],
            'resort_id' => ['required', 'exists:resorts,id'],
        ]);

        DB::table('marketer_resorts')->updateOrInsert(
            ['marketer_id' => $data['marketer_id'], 'resort_id' => $data['resort_id']],
            ['created_at' => now(), 'updated_at' => now()]
        );

        return $this->successResponse(null, 'Resort assigned to marketer');
    }

    /** Unassign a resort from a marketer. */
    public function unassign(Request $request)
    {
        $data = $request->validate([
            'marketer_id' => ['required', 'integer'],
            'resort_id' => ['required', 'integer'],
        ]);

        DB::table('marketer_resorts')
            ->where('marketer_id', $data['marketer_id'])
            ->where('resort_id', $data['resort_id'])
            ->delete();

        return $this->successResponse(null, 'Resort unassigned from marketer');
    }

    /** Release a commission manually. */
    public function release(Request $request, Commission $commission)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        if ($commission->status === 'released') {
            return $this->errorResponse('Commission already released.', null, 422);
        }

        if ($commission->payout_batch_id !== null) {
            $batch = MarketerPayoutBatch::query()->find($commission->payout_batch_id);
            if ($batch && in_array($batch->status, [
                MarketerPayoutBatch::STATUS_PENDING_SUBMIT,
                MarketerPayoutBatch::STATUS_SUBMITTED,
            ], true)) {
                return $this->errorResponse(
                    'This commission is locked for an automated GCash payout. Wait for Xendit to finish or fail before releasing manually.',
                    null,
                    422
                );
            }
        }

        DB::transaction(function () use ($commission, $data): void {
            CommissionRelease::create([
                'commission_id' => $commission->id,
                'released_by' => auth()->id(),
                'amount' => $commission->commission_amount,
                'notes' => $data['notes'] ?? null,
                'released_at' => now(),
                'release_source' => CommissionRelease::SOURCE_MANUAL,
                'payout_batch_id' => null,
            ]);

            $commission->update(['status' => 'released']);

            $this->audits->log('commission_released', 'commission', $commission->id, ['status' => 'pending'], ['status' => 'released']);
        });

        return $this->successResponse(null, 'Commission released');
    }
}
