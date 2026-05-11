import { BrandWordmark } from "@/components/branding/BrandWordmark";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";
import { BadgeCheck, Building2, ClipboardCheck, Shield } from "lucide-react";
import Link from "next/link";

export default function VerifyResortPage() {
  return (
    <main className="paper-texture-section min-h-[60vh]">
      <PageContainer className="section-padding max-w-3xl">
        <div className="soft-panel p-8 md:p-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-clTeal">Verify resort</p>
          <SectionHeading
            title={
              <>
                How <BrandWordmark tone="onLight" size="md" className="inline align-middle" /> verifies resorts
              </>
            }
            subtitle="Every listed property goes through checks so guests can book with confidence."
          />
          <ul className="mt-8 space-y-5 text-sm leading-relaxed text-zinc-700">
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
              <span>
                <strong className="text-navy">Identity and legitimacy</strong> — business registration and
                resort contact details are reviewed before a public profile goes live.
              </span>
            </li>
            <li className="flex gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
              <span>
                <strong className="text-navy">Listing quality</strong> — rooms, photos, and policies are checked
                against our platform standards for transparency.
              </span>
            </li>
            <li className="flex gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-clTeal" aria-hidden />
              <span>
                <strong className="text-navy">Ongoing monitoring</strong> — guest feedback and booking patterns
                help us keep the marketplace trustworthy.
              </span>
            </li>
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/resorts"
              className="glass-inline-btn justify-center px-6 py-2.5 font-semibold text-navy"
            >
              Browse verified resorts
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accentOrange via-clCoral to-accentOrange px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-navy shadow-dash-accent transition hover:from-accentOrangeDark hover:via-clCoralDark hover:to-accentOrangeDark"
            >
              <Building2 size={16} aria-hidden />
              Register your resort
            </Link>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
