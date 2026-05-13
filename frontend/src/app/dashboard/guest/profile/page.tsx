"use client";

import ChangePasswordCard from "@/components/dashboard/ChangePasswordCard";
import { useToast } from "@/components/shared/ToastProvider";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { sanitizeEmailTyping, sanitizePersonName } from "@/lib/inputRestrictions";
import { formatRoleLabel } from "@/lib/utils";
import { Camera, Loader2, Mail, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export default function GuestProfilePage() {
  const { user, refreshUser } = useAuth();
  const { pushToast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch("/auth/profile", { name, email });
      await refreshUser();
      pushToast({ title: "Profile updated", description: "Your details were saved successfully.", tone: "success" });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      pushToast({
        title: "Couldn’t save profile",
        description: axiosErr?.response?.data?.message ?? "Something went wrong. Try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
      pushToast({
        title: "Invalid image type",
        description: "Use PNG, JPEG, or WebP.",
        tone: "error",
      });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      pushToast({ title: "File too large", description: "Maximum size is 2 MB.", tone: "error" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      await apiClient.post("/auth/avatar", fd);
      await refreshUser();
      setAvatarPreview(URL.createObjectURL(file));
      pushToast({ title: "Avatar updated", tone: "success" });
    } catch {
      pushToast({ title: "Upload failed", tone: "error" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <Settings size={22} className="text-skyBlue" /> Profile
        </h1>
        <p className="dash-page-sub">
          Signed in as <span className="font-semibold text-navy">{formatRoleLabel(user?.role)}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={onSave} className="dash-card space-y-4 p-6">
          <div className="flex items-center gap-3">
            <User className="text-zinc-400" size={18} />
            <h2 className="font-dash text-lg font-semibold text-navy">Contact</h2>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700">Full name</label>
            <input
              className="dash-input"
              value={name}
              onChange={(e) => setName(sanitizePersonName(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700">Email</label>
            <div className="relative">
              <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="dash-input pl-9"
                type="email"
                value={email}
                onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
                required
              />
            </div>
          </div>
          <button type="submit" className="dash-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="dash-card p-6">
            <h2 className="font-dash text-sm font-semibold text-navy">Photo</h2>
            <input ref={avatarRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAvatarChange} />
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-softBorder py-2 text-sm font-semibold text-zinc-700 hover:bg-softGray"
              disabled={uploadingAvatar}
              onClick={() => avatarRef.current?.click()}
            >
              {uploadingAvatar ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              Update avatar
            </button>
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="" className="mt-3 h-24 w-24 rounded-xl object-cover" />
            ) : null}
          </div>
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}
