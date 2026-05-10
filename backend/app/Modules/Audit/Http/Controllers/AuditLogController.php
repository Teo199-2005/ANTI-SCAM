<?php

namespace App\Modules\Audit\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\SafeSort;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $perPage    = (int) $request->integer('perPage', 25);
        $action     = $request->string('action')->value();
        $entityType = $request->string('entityType')->value();
        $userId     = $request->integer('userId');

        $query = AuditLog::withoutGlobalScopes();

        SafeSort::apply(
            $query,
            $request->string('sort_by')->value(),
            $request->string('sort_dir')->value(),
            ['created_at', 'action', 'entity_type', 'entity_id', 'id'],
            'created_at',
            'desc'
        );

        if ($action) {
            $query->where('action', 'like', "%{$action}%");
        }

        if ($entityType) {
            $query->where('entity_type', $entityType);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $this->successResponse($query->paginate($perPage), 'Audit logs fetched');
    }
}
