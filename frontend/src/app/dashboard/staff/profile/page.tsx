"use client";

import ChangePasswordCard from "@/components/dashboard/ChangePasswordCard";
import { useAuth } from "@/contexts/AuthContext";
import { formatRoleLabel } from "@/lib/utils";
import { Mail, Settings, User } from "lucide-react";

export default function StaffProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="dash-card p-6 lg:p-8">
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <Settings size={22} className="text-skyBlue" />
          Staff profile
        </h1>
        <p className="dash-page-sub">
          Account details are managed by platform admins. You can update your password here anytime.
        </p>
        <div className="mt-6 grid gap-4 border-t border-softBorder pt-6 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-zinc-600">Name</p>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-navy">
              <User size={14} className="text-zinc-500" />
              {user?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-zinc-600">Email</p>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-navy">
              <Mail size={14} className="text-zinc-500" />
              {user?.email ?? "—"}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="mb-1.5 text-xs font-semibold text-zinc-600">Role</p>
            <p className="text-sm text-zinc-700">{formatRoleLabel(user?.role)}</p>
          </div>
        </div>
      </div>

      <ChangePasswordCard
        idPrefix="staff-profile"
        description={
          <>
            Change your staff login password. Use at least 8 characters with uppercase, lowercase, and a number. Other
            sessions will be signed out.
          </>
        }
      />
    </div>
  );
}
