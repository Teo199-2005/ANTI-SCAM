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

export default function ClientProfilePage() {
  const { user, refreshUser } = useAuth();
  const { pushToast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  // Avatar
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
        description: "Use PNG, JPG, or WebP for your profile photo.",
        tone: "warning",
      });
      e.target.value = "";
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      pushToast({
        title: "Image too large",
        description: "Please upload a photo up to 2 MB.",
        tone: "warning",
      });
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await apiClient.post("/auth/avatar", form);
      await refreshUser();
      pushToast({ title: "Photo updated", description: "Your profile picture was uploaded.", tone: "success" });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      setAvatarPreview(null);
      pushToast({
        title: "Upload failed",
        description: axiosErr?.response?.data?.message ?? "Check the file type (PNG, JPG, WebP) and size (max 2 MB), then try again.",
        tone: "error",
      });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="space-y-6">
      <div className="dash-card p-6">
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <Settings size={24} className="text-skyBlue" />
          My profile
        </h1>
        <p className="dash-page-sub">Update your personal information and account settings.</p>
      </div>

      {/* Avatar */}
      <div className="dash-card p-6">
        <h2 className="mb-4 font-dash text-lg text-navy">Profile photo</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Avatar preview" className="h-16 w-16 rounded-full object-cover ring-2 ring-skyBlue/30" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slateBlue to-navy text-lg font-bold text-white">
                {initials}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-softCard/80">
                <Loader2 size={16} className="animate-spin text-navy" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="dash-btn-sm inline-flex items-center gap-2"
              disabled={uploadingAvatar}
            >
              <Camera size={14} />
              {uploadingAvatar ? "Uploading…" : "Upload photo"}
            </button>
            <p className="mt-1 text-xs text-zinc-500">PNG, JPG or WEBP · max 2 MB</p>
            <input
              ref={avatarRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={onAvatarChange}
              aria-label="Upload profile photo"
            />
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="dash-card p-6">
        <h2 className="mb-4 font-dash text-lg text-navy">Personal information</h2>
        <form className="space-y-4" onSubmit={onSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="client-profile-name" className="mb-1.5 block text-xs font-semibold text-zinc-600">Full name</label>
              <div className="relative">
                <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="client-profile-name"
                  className="dash-input pl-9"
                  value={name}
                  onChange={(e) => setName(sanitizePersonName(e.target.value))}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="client-profile-email" className="mb-1.5 block text-xs font-semibold text-zinc-600">Email</label>
              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="client-profile-email"
                  className="dash-input pl-9"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
                  required
                />
              </div>
            </div>

            <div className="dash-inset md:col-span-2">
              <p>
                <span className="font-semibold text-navy">Role:</span> {formatRoleLabel(user?.role)}
              </p>
            </div>

            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="dash-btn-primary disabled:opacity-60">
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Saving…
                  </span>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ChangePasswordCard idPrefix="client-profile" />
    </div>
  );
}
