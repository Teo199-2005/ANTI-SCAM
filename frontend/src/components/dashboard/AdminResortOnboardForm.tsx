"use client";

import { PhilippineLocationPicker, type PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { LegalLinkButton } from "@/components/legal/LegalLinkButton";
import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import { AssignableOwner } from "@/lib/api/admin";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { sanitizeEmailTyping, sanitizePersonName } from "@/lib/inputRestrictions";
import { ACCEPT_RASTER_IMAGES } from "@/lib/uploads/resortProfileUploads";
import { buildPhilippinesGeocodeQuery } from "@/lib/locations/buildPhilippinesGeocodeQuery";
import {
  Building2,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Upload,
  User,
  UserRoundCheck,
  Waves,
  Eye,
  EyeOff,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

const ResortMapPinPicker = dynamic(() => import("@/components/resort-profile/ResortMapPinPicker"), { ssr: false });

export type AdminOnboardFormState = {
  tenant_name: string;
  resort_name: string;
  subdomain: string;
  address_province_psgc: string | null;
  address_city_municipality_psgc: string | null;
  address_barangay_psgc: string | null;
  address_barangay_name: string | null;
  address_street_line: string;
  map_latitude: number | null;
  map_longitude: number | null;
  contact_number: string;
  logo_url: string;
  background_image_url: string;
  description: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  representative_name: string;
  representative_contact_number: string;
  cancellation_policy: string;
  amenities: string;
  plan: "basic";
  owner_account_mode: "create" | "existing";
  owner_name: string;
  owner_email: string;
  owner_password: string;
  owner_password_confirmation: string;
  owner_user_id: string;
  is_publicly_listed: boolean;
};

type Props = {
  form: AdminOnboardFormState;
  isEditMode: boolean;
  saving: boolean;
  uploadingLogo: boolean;
  uploadingBg: boolean;
  owners: AssignableOwner[];
  loadingOwners: boolean;
  ownerLoadError: string | null;
  selectedOwnerEmail: string | null;
  acceptAdminTerms: boolean;
  onFetchOwners: () => void;
  onChange: (key: keyof AdminOnboardFormState, value: string | boolean) => void;
  onLocationChange: (next: PhilippineLocationValue) => void;
  onMapPinChange: (lat: number | null, lng: number | null) => void;
  onLogoUpload: (file: File | null) => void;
  onBgUpload: (file: File | null) => void;
  onAcceptTermsChange: (checked: boolean) => void;
  ownerAccountValid?: boolean;
};

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-softBorder pt-6 first:border-t-0 first:pt-0">
      <h2 className="inline-flex items-center gap-2 font-dash text-lg font-semibold text-navy">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function AdminResortOnboardForm({
  form,
  isEditMode,
  saving,
  uploadingLogo,
  uploadingBg,
  owners,
  loadingOwners,
  ownerLoadError,
  selectedOwnerEmail,
  acceptAdminTerms,
  onFetchOwners,
  onChange,
  onLocationChange,
  onMapPinChange,
  onLogoUpload,
  onBgUpload,
  onAcceptTermsChange,
  ownerAccountValid = true,
}: Props) {
  const [showOwnerPw, setShowOwnerPw] = useState(false);
  const [showOwnerPw2, setShowOwnerPw2] = useState(false);

  const mapRegionGeocodeQuery = useMemo(
    () => buildPhilippinesGeocodeQuery(form.address_province_psgc, form.address_city_municipality_psgc),
    [form.address_province_psgc, form.address_city_municipality_psgc],
  );

  return (
    <div className="space-y-6">
      {!isEditMode ? (
        <Section title="Account & subscription" icon={<Building2 size={16} className="text-skyBlue" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Account / tenant name * <span className="font-normal text-zinc-400">(login + billing)</span>
              </label>
              <input
                className="dash-input"
                required
                placeholder="Beach Paradise Properties"
                value={form.tenant_name}
                onChange={(e) => onChange("tenant_name", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Resort display name * <span className="font-normal text-zinc-400">(public)</span>
              </label>
              <input
                className="dash-input"
                required
                placeholder="Beach Paradise Resort"
                value={form.resort_name}
                onChange={(e) => onChange("resort_name", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                Subdomain * <span className="font-normal text-zinc-400">(e.g. beachparadise)</span>
              </label>
              <div className="relative">
                <Globe size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  className="dash-input pl-9"
                  required
                  placeholder="beachparadise"
                  pattern="[a-z0-9-]+"
                  value={form.subdomain}
                  onChange={(e) => onChange("subdomain", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Subscription plan *</label>
              <input className="dash-input" value="Standard plan set (owner picks duration at checkout)" readOnly />
              <p className="mt-2 text-xs text-zinc-500">
                New resorts start <strong>inactive</strong> until the owner pays or enters a valid referral code. Owners
                complete logo, location, background, and rooms in their profile before going live.
              </p>
            </div>
            <div className="sm:col-span-2 space-y-4">
              <div>
                <span className="mb-2 block text-xs font-semibold text-zinc-600">Resort owner login *</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Owner account source">
                  <button
                    type="button"
                    className={`dash-btn-sm ${form.owner_account_mode === "create" ? "border-skyBlue bg-skyBlue/10 text-navy" : ""}`}
                    onClick={() => onChange("owner_account_mode", "create")}
                  >
                    Create new account
                  </button>
                  <button
                    type="button"
                    className={`dash-btn-sm ${form.owner_account_mode === "existing" ? "border-skyBlue bg-skyBlue/10 text-navy" : ""}`}
                    onClick={() => onChange("owner_account_mode", "existing")}
                  >
                    Use existing account
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Owners sign in at the main login page with their email and password to open the resort dashboard.
                </p>
              </div>

              {form.owner_account_mode === "create" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Owner full name *</label>
                    <input
                      className="dash-input"
                      required
                      autoComplete="name"
                      placeholder="Juan Dela Cruz"
                      value={form.owner_name}
                      onChange={(e) => onChange("owner_name", sanitizePersonName(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Owner email *</label>
                    <input
                      className="dash-input"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="owner@resort.com"
                      value={form.owner_email}
                      onChange={(e) => onChange("owner_email", sanitizeEmailTyping(e.target.value).toLowerCase())}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Password *</label>
                    <div className="relative">
                      <input
                        className="dash-input pr-10"
                        type={showOwnerPw ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        minLength={8}
                        value={form.owner_password}
                        onChange={(e) => onChange("owner_password", e.target.value)}
                        aria-describedby="admin-onboard-owner-pw-meter"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setShowOwnerPw((v) => !v)}
                        aria-label={showOwnerPw ? "Hide password" : "Show password"}
                      >
                        {showOwnerPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <PasswordRequirementsMeter
                      className="mt-2"
                      variant="dash"
                      password={form.owner_password}
                      confirmation={form.owner_password_confirmation}
                      id="admin-onboard-owner-pw-meter"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Confirm password *</label>
                    <div className="relative">
                      <input
                        className="dash-input pr-10"
                        type={showOwnerPw2 ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        minLength={8}
                        value={form.owner_password_confirmation}
                        onChange={(e) => onChange("owner_password_confirmation", e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setShowOwnerPw2((v) => !v)}
                        aria-label={showOwnerPw2 ? "Hide confirmation" : "Show confirmation"}
                      >
                        {showOwnerPw2 ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {!ownerAccountValid ? (
                    <p className="sm:col-span-2 text-xs text-amber-700">
                      Complete the password requirements and make sure both fields match before submitting.
                    </p>
                  ) : null}
                  <p className="sm:col-span-2 text-xs text-zinc-500">
                    Share the email and password with the owner securely. They can change the password later from their
                    account settings.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Unassigned resort owner *</label>
                  <select
                    className="dash-input"
                    required
                    disabled={loadingOwners || Boolean(ownerLoadError)}
                    value={form.owner_user_id}
                    onChange={(e) => onChange("owner_user_id", e.target.value)}
                  >
                    <option value="">Select resort owner account</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={String(owner.id)}>
                        {owner.name} ({owner.email})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-zinc-500">
                    Only accounts created under{" "}
                    <Link href="/dashboard/admin/users" className="font-medium text-skyBlue hover:underline">
                      Users
                    </Link>{" "}
                    with role Resort owner and no tenant yet appear here. The password was set when that user was
                    created.
                  </p>
                  {ownerLoadError ? (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-xs text-rose-600">{ownerLoadError}</p>
                      <button type="button" className="dash-btn-sm" onClick={onFetchOwners}>
                        Retry
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>          </div>
        </Section>
      ) : (
        <Section title="Resort name" icon={<Building2 size={16} className="text-skyBlue" />}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Resort display name *</label>
            <input
              className="dash-input"
              required
              value={form.resort_name}
              onChange={(e) => onChange("resort_name", e.target.value)}
            />
          </div>
        </Section>
      )}

      <Section title="Branding" icon={<ImageIcon size={16} className="text-skyBlue" />}>
        <p className="text-xs text-zinc-500">
          Logo and cover photo appear on the public landing page. Owners can refine crops later in Profile → Media editor.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Resort logo</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={laravelPublicUrl(form.logo_url)}
                  alt="Logo preview"
                  className="h-24 w-24 rounded-xl border border-softBorder bg-white object-contain"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-softBorder text-[10px] text-zinc-400">
                  No logo
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-softBorder bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                <Upload size={14} />
                {uploadingLogo ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept={ACCEPT_RASTER_IMAGES}
                  className="hidden"
                  disabled={uploadingLogo || saving}
                  onChange={(e) => onLogoUpload(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Background / cover image</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.background_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={laravelPublicUrl(form.background_image_url)}
                  alt="Cover preview"
                  className="h-24 w-40 rounded-xl border border-softBorder bg-zinc-100 object-cover"
                />
              ) : (
                <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-softBorder text-[10px] text-zinc-400">
                  No cover
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-softBorder bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                <Upload size={14} />
                {uploadingBg ? "Uploading…" : "Upload cover"}
                <input
                  type="file"
                  accept={ACCEPT_RASTER_IMAGES}
                  className="hidden"
                  disabled={uploadingBg || saving}
                  onChange={(e) => onBgUpload(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Location & map" icon={<MapPin size={16} className="text-skyBlue" />}>
        <PhilippineLocationPicker
          idPrefix="admin-onboard"
          disabled={saving}
          legacyBarangayCodeHint={Boolean(form.address_barangay_psgc && !form.address_barangay_name?.trim())}
          value={{
            provinceCode: form.address_province_psgc,
            cityCode: form.address_city_municipality_psgc,
            barangayName: form.address_barangay_name,
          }}
          onChange={onLocationChange}
          barangayRowEnd={
            <>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Street / building line</label>
              <input
                className="dash-input"
                value={form.address_street_line}
                onChange={(e) => onChange("address_street_line", e.target.value)}
                placeholder="House number, street, subdivision (optional)"
              />
            </>
          }
        />
        <div className="space-y-2 rounded-xl border border-softBorder bg-softCard/40 p-4">
          <p className="text-xs font-semibold text-zinc-600">Map pin (optional)</p>
          <ResortMapPinPicker
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            latitude={form.map_latitude}
            longitude={form.map_longitude}
            disabled={saving}
            regionGeocodeQuery={mapRegionGeocodeQuery}
            onPinChange={onMapPinChange}
          />
          <button
            type="button"
            className="dash-btn-sm border border-zinc-200 bg-white text-zinc-700"
            disabled={saving || (form.map_latitude == null && form.map_longitude == null)}
            onClick={() => onMapPinChange(null, null)}
          >
            Clear map pin
          </button>
        </div>
      </Section>

      <Section title="Resort details" icon={<FileText size={16} className="text-skyBlue" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Contact number</label>
            <input
              className="dash-input"
              placeholder="0917-874-4889"
              value={form.contact_number}
              onChange={(e) => onChange("contact_number", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Description</label>
            <textarea
              className="dash-input min-h-[88px] resize-none"
              placeholder="Short public description for the landing page About section…"
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Amenities <span className="font-normal text-zinc-400">(comma-separated)</span>
            </label>
            <input
              className="dash-input"
              placeholder="Pool, Wi-Fi, Air conditioning, Parking"
              value={form.amenities}
              onChange={(e) => onChange("amenities", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Cancellation policy</label>
            <textarea
              className="dash-input min-h-[72px] resize-none"
              placeholder="Optional policy text shown to guests…"
              value={form.cancellation_policy}
              onChange={(e) => onChange("cancellation_policy", e.target.value)}
            />
          </div>
          <label className="sm:col-span-2 inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-softBorder accent-primaryBlue"
              checked={form.is_publicly_listed}
              onChange={(e) => onChange("is_publicly_listed", e.target.checked)}
            />
            <Waves size={14} className="text-zinc-500" />
            Publicly list this resort on the platform after onboarding
          </label>
        </div>
      </Section>

      <Section title="Social links" icon={<Globe size={16} className="text-skyBlue" />}>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Facebook</label>
            <input
              type="url"
              className="dash-input"
              value={form.facebook_url}
              onChange={(e) => onChange("facebook_url", e.target.value)}
              placeholder="https://facebook.com/…"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Instagram</label>
            <input
              type="url"
              className="dash-input"
              value={form.instagram_url}
              onChange={(e) => onChange("instagram_url", e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600">TikTok</label>
            <input
              type="url"
              className="dash-input"
              value={form.tiktok_url}
              onChange={(e) => onChange("tiktok_url", e.target.value)}
              placeholder="https://www.tiktok.com/@…"
            />
          </div>
        </div>
      </Section>

      <Section title="Representative" icon={<UserRoundCheck size={16} className="text-skyBlue" />}>
        <p className="text-xs text-zinc-500">Shown on the public landing page footer. Prefilled from the selected owner when possible.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-zinc-600">
              <User size={13} /> Representative name
            </label>
            <input
              className="dash-input"
              value={form.representative_name}
              onChange={(e) => onChange("representative_name", e.target.value)}
              placeholder="Contact person"
            />
          </div>
          <div>
            <label className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-zinc-600">
              <Phone size={13} /> Representative phone
            </label>
            <input
              className="dash-input"
              value={form.representative_contact_number}
              onChange={(e) => onChange("representative_contact_number", e.target.value)}
              placeholder="09xx xxx xxxx"
            />
          </div>
          {selectedOwnerEmail ? (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Owner login email</label>
              <input className="dash-input cursor-not-allowed bg-zinc-50 text-zinc-600" readOnly value={selectedOwnerEmail} />
            </div>
          ) : null}
        </div>
      </Section>

      {!isEditMode ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
          <input
            id="admin-accept-terms"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-softBorder accent-primaryBlue"
            checked={acceptAdminTerms}
            onChange={(e) => onAcceptTermsChange(e.target.checked)}
          />
          <label htmlFor="admin-accept-terms" className="text-sm text-zinc-700">
            I confirm the selected resort owner has been given access to the{" "}
            <LegalLinkButton kind="terms">Terms &amp; Conditions</LegalLinkButton> and agrees to them as part of
            onboarding. A copy will be emailed to the owner.
          </label>
        </div>
      ) : null}
    </div>
  );
}
