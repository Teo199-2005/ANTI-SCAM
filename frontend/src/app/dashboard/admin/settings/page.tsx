"use client";

import DashCard from "@/components/dash/DashCard";
import ChangePasswordCard from "@/components/dashboard/ChangePasswordCard";
import { useToast } from "@/components/shared/ToastProvider";
import { getSystemSettings, sendAdminMailTest, updateSystemSettings, type SystemSetting } from "@/lib/api/admin";
import {
  sanitizeEmailTyping,
  sanitizeIntegerDigitsOnly,
  sanitizeLongText,
} from "@/lib/inputRestrictions";
import { Info, Loader2, Mail, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MARKETING_KEYS = new Set([
  "marketing_booking_commission_php",
  "marketing_booking_commission_enabled",
]);

function sortSettings(rows: SystemSetting[]): SystemSetting[] {
  return [...rows].sort((a, b) => {
    const aM = MARKETING_KEYS.has(a.key) ? 0 : 1;
    const bM = MARKETING_KEYS.has(b.key) ? 0 : 1;
    if (aM !== bM) return aM - bM;
    return a.key.localeCompare(b.key);
  });
}

export default function SystemSettingsPage() {
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [policyNote, setPolicyNote] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingMailTest, setSendingMailTest] = useState(false);
  const [mailTestTo, setMailTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => sortSettings(settings), [settings]);

  useEffect(() => {
    void getSystemSettings()
      .then((payload) => {
        setSettings(payload.settings);
        setPolicyNote(payload.marketing_commission_policy_note ?? null);
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
      const note = await updateSystemSettings(payload);
      setSettings((prev) => prev.map((s) => (edited[s.key] !== undefined ? { ...s, value: edited[s.key] } : s)));
      setEdited({});
      if (note) setPolicyNote(note);
      pushToast({
        title: "Settings saved",
        description: "Booking commission rate changes apply to new credits only.",
        tone: "success",
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      pushToast({
        title: "Could not save settings",
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
        <p className="dash-page-sub">Platform-wide configuration. Marketer booking commission changes affect new credits only.</p>
      </div>

      {policyNote ? (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <Info className="mt-0.5 shrink-0" size={18} />
          <p>{policyNote}</p>
        </div>
      ) : null}

      <DashCard className="overflow-hidden p-0">
        {error ? <p className="px-6 py-4 text-sm text-rose-700">{error}</p> : null}
        {loading ? (
          <div className="space-y-3 p-6">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-softGray" />)}</div>
        ) : (
          <div className="divide-y divide-softBorder">
            {sorted.map((s) => (
              <div key={s.key} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">
                    {s.key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    {MARKETING_KEYS.has(s.key) ? (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-violet-700">Booking commission</span>
                    ) : null}
                  </p>
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
                  ) : s.type === "decimal" ? (
                    <input
                      className="dash-input"
                      type="number"
                      min={1}
                      max={5000}
                      step={0.01}
                      value={edited[s.key] ?? s.value}
                      onChange={(e) => handleChange(s.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="dash-input"
                      type={s.type === "integer" ? "number" : "text"}
                      value={edited[s.key] ?? s.value}
                      onChange={(e) =>
                        handleChange(
                          s.key,
                          s.type === "integer"
                            ? sanitizeIntegerDigitsOnly(e.target.value, 12)
                            : sanitizeLongText(e.target.value, 8000),
                        )
                      }
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
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </span>
            ) : (
              "Save settings"
            )}
          </button>
        </div>
      </DashCard>

      <ChangePasswordCard
        idPrefix="admin-settings"
        title="Reset password"
        description={
          <>
            Change the password for whoever is signed in on this browser. Requirements: at least 8 characters, uppercase,
            lowercase, and a number (same rules as registration).
          </>
        }
        successHint="Your platform login password was changed. Other sessions were signed out."
      />

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
            onChange={(e) => setMailTestTo(sanitizeEmailTyping(e.target.value).toLowerCase())}
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
