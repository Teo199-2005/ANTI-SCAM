"use client";

import DashCard from "@/components/dash/DashCard";
import { useToast } from "@/components/shared/ToastProvider";
import { getSystemSettings, updateSystemSettings, SystemSetting } from "@/lib/api/admin";
import { Loader2, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function SystemSettingsPage() {
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSystemSettings()
      .then((rows) => {
        setSettings(rows);
        setError(null);
      })
      .catch(() => {
        setSettings([]);
        setError("Failed to load system settings.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) =>
    setEdited((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(edited).map(([key, value]) => ({ key, value }));
      if (payload.length === 0) {
        pushToast({ title: "Nothing to save", description: "Change a value before saving.", tone: "info" });
        return;
      }
      await updateSystemSettings(payload);
      setSettings((prev) => prev.map((s) => edited[s.key] !== undefined ? { ...s, value: edited[s.key] } : s));
      setEdited({});
      pushToast({ title: "Settings saved", description: "Platform configuration was updated.", tone: "success" });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      pushToast({
        title: "Save failed",
        description: err?.response?.data?.message ?? "Could not save settings.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <Settings size={22} className="text-skyBlue" /> System Settings
        </h1>
        <p className="dash-page-sub">Platform-wide configuration rules. Changes take effect immediately.</p>
      </div>

      <DashCard className="overflow-hidden p-0">
        {error ? <p className="px-6 py-4 text-sm text-rose-700">{error}</p> : null}
        {loading ? (
          <div className="space-y-3 p-6">{[1,2,3,4,5].map(i=><div key={i} className="h-14 animate-pulse rounded-xl bg-softGray"/>)}</div>
        ) : (
          <div className="divide-y divide-softBorder">
            {settings.map((s) => (
              <div key={s.key} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{s.key.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                  {s.description ? <p className="text-xs text-zinc-400">{s.description}</p> : null}
                </div>
                <div className="w-48">
                  {s.type === "boolean" ? (
                    <select
                      className="dash-input"
                      value={edited[s.key] ?? s.value}
                      onChange={(e) => handleChange(s.key, e.target.value)}
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input
                      className="dash-input"
                      type={s.type === "integer" ? "number" : "text"}
                      value={edited[s.key] ?? s.value}
                      onChange={(e) => handleChange(s.key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-softBorder px-6 py-4">
          <button
            className="dash-btn-primary px-6 py-2.5 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving || Object.keys(edited).length === 0}
          >
            {saving ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Saving…</span> : "Save settings"}
          </button>
        </div>
      </DashCard>
    </div>
  );
}
