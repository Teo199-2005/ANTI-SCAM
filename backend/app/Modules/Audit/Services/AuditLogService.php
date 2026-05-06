<?php

namespace App\Modules\Audit\Services;

use App\Models\AuditLog;
use App\Support\Tenancy\TenantContext;

class AuditLogService
{
    public function log(
        string $action,
        string $entityType,
        ?int $entityId,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
        ?string $reason = null
    ): ?AuditLog {
        $user = auth()->user();

        $payload = [
            'tenant_id'   => TenantContext::tenantId(),
            'user_id'     => $user?->id,
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'old_values'  => $oldValues,
            'new_values'  => $newValues,
            'metadata'    => $metadata,
        ];

        // Extended fields added in migration 2026_04_23_200001.
        // Wrapped defensively so actions don't 500 if the migration is pending.
        try {
            $payload['actor_role'] = $user?->role;
            $payload['reason']     = $reason;
            $payload['ip_address'] = request()?->ip();

            return AuditLog::withoutGlobalScopes()->create($payload);
        } catch (\Throwable $e) {
            // If extended columns don't yet exist, retry without them.
            if (str_contains($e->getMessage(), 'actor_role')
                || str_contains($e->getMessage(), 'ip_address')
                || str_contains($e->getMessage(), 'reason')
            ) {
                unset($payload['actor_role'], $payload['reason'], $payload['ip_address']);
                try {
                    return AuditLog::withoutGlobalScopes()->create($payload);
                } catch (\Throwable) {
                    // Audit failure must never break the primary action.
                    return null;
                }
            }

            return null;
        }
    }
}
