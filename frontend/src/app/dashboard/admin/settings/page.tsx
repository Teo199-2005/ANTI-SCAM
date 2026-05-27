"use client";

import { useEffect, useState } from "react";
import { getSystemSettings, updateSystemSettings, type SystemSetting } from "@/lib/api/admin";
import { useToast } from "@/components/shared/ToastProvider";

function SettingCard({ title, value, onEdit }: { title: string; value: string; onEdit: () => void }) {
  return (
    <div className="dash-card p-4 flex flex-col justify-between">
      <div>
        <div className="text-sm font-semibold text-navy mb-2">{title}</div>
        <div className="text-lg font-medium text-zinc-800">{value}</div>
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium bg-white hover:bg-zinc-50"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const { pushToast } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const payload = await getSystemSettings();
        const map: Record<string, string> = {};
        payload.settings.forEach((s: SystemSetting) => {
          map[s.key] = String(s.value ?? "");
        });
        if (mounted) setSettingsMap(map);
      } catch (err) {
        pushToast({ title: "Could not load settings", description: "Please try again.", tone: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pushToast]);

  const saveKey = async (key: string, newValue: string) => {
    try {
      await updateSystemSettings([{ key, value: String(newValue) }]);
      setSettingsMap((s) => ({ ...s, [key]: String(newValue) }));
      pushToast({ title: "Saved", description: `${key} updated.`, tone: "success" });
    } catch (err) {
      pushToast({ title: "Save failed", description: "Could not update setting.", tone: "error" });
    }
  };

  const editKeyPrompt = async (key: string, label: string) => {
    const current = settingsMap[key] ?? "";
    // simple prompt-based edit to keep UI minimal
    // eslint-disable-next-line no-alert
    const val = window.prompt(`Enter new value for ${label}:`, current);
    if (val === null) return;
    await saveKey(key, val);
  };

  // Keys chosen for the 2x2 grid — adjust as needed
  const gridKeys: Array<{ key: string; label: string; defaultVal: string }> = [
    { key: "reservation_fee", label: "Reservation Fee (PHP)", defaultVal: "500" },
    { key: "marketing_booking_commission_php", label: "Marketing Booking Commission (PHP)", defaultVal: "10.00" },
    { key: "booking_lock_minutes", label: "Booking Lock Minutes", defaultVal: "10" },
    { key: "email_notifications_enabled", label: "Email Notifications (enabled)", defaultVal: "1" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="dash-page-title">System Settings</h1>
          <p className="dash-page-sub">Quick edit of core platform settings (2x2 grid).</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-medium-emphasis">Loading settings…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gridKeys.map(({ key, label, defaultVal }) => (
            <SettingCard
              key={key}
              title={label}
              value={settingsMap[key] ?? defaultVal}
              onEdit={() => void editKeyPrompt(key, label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

