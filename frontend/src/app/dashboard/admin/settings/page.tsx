"use client";

import DashCard from "@/components/dash/DashCard";
import { useToast } from "@/components/shared/ToastProvider";
import { getSystemSettings, sendAdminMailTest, updateSystemSettings, SystemSetting } from "@/lib/api/admin";
import { Loader2, Mail, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function SystemSettingsPage() {
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingMailTest, setSendingMailTest] = useState(false);
  const [mailTestTo, setMailTestTo] = useState("");
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

  const handleSendMailTest = async () => {
    const to = mailTestTo.trim();
    if (!to) {
      pushToast({ title: "Recipient required", description: "Enter an email address.", tone: "warning" });
      return;
    }
    setSendingMailTest(true);
    try {
      const result = await sendAdminMailTest(to);
      pushToast({
        title: "Mail test sent",
        description: `Email accepted for delivery. Email log #${result.email_log_id}.`,
        tone: "success",
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      pushToast({
        title: "Mail test failed",
        description: err?.response?.data?.message ?? "Could not send test email.",
        tone: "error",
      });
    } finally {
      setSendingMailTest(false);
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

      <DashCard className="p-6">
        <h2 className="mb-2 inline-flex items-center gap-2 font-dash text-lg font-semibold text-navy">
          <Mail size={18} className="text-skyBlue" />
          SMTP / Brevo Mail Test
        </h2>
        <p className="mb-4 text-sm text-zinc-600">
          Send a test email using your current backend mail configuration and write a row to <code>email_logs</code>.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="dash-input sm:max-w-sm"
            type="email"
            placeholder="you@example.com"
            value={mailTestTo}
            onChange={(e) => setMailTestTo(e.target.value)}
          />
          <button
            type="button"
            className="dash-btn-primary px-5 py-2.5 disabled:opacity-60"
            onClick={handleSendMailTest}
            disabled={sendingMailTest}
          >
            {sendingMailTest ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Sending…
              </span>
            ) : (
              "Send test email"
            )}
          </button>
        </div>
      </DashCard>
    </div>
  );
}
