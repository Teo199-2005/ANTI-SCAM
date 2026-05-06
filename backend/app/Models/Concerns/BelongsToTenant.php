<?php

namespace App\Models\Concerns;

use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::creating(function ($model): void {
            if (! isset($model->tenant_id) && TenantContext::tenantId()) {
                $model->tenant_id = TenantContext::tenantId();
            }
        });

        static::addGlobalScope('tenant', function (Builder $builder): void {
            $tenantId = TenantContext::tenantId();
            if ($tenantId) {
                $builder->where($builder->getModel()->getTable().'.tenant_id', $tenantId);
            }
        });
    }
}
