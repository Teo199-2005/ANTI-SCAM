import Link from "next/link";
import type { LandingComputedFooter } from "@/lib/api/landingPage";
import PoweredByMark from "@/components/branding/PoweredByMark";

type Props = {
  footer: LandingComputedFooter;
  resortName: string;
};

export function ResortFooterSection({ footer, resortName }: Props) {
  const hasOwnerInfo = footer.ownerName || footer.ownerContact;
  const hasRepInfo = footer.representativeName || footer.representativeContact || footer.contactEmail;
  const hasContactInfo = footer.resortContact || footer.address;

  return (
    <footer className="border-t border-zinc-200 bg-navy px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-center">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            Anti-Scam PH Verified Landing
          </span>
        </div>
        <div className="mb-8 h-px w-full bg-white/20" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Resort info */}
          <div>
            <h3 className="mb-3 font-heading text-base font-semibold text-white">{resortName}</h3>
            {hasContactInfo && (
              <div className="space-y-1.5 text-sm text-white/75">
                {footer.address && <p>{footer.address}</p>}
                {footer.resortContact && (
                  <p>
                    <a href={`tel:${footer.resortContact}`} className="hover:text-white">
                      {footer.resortContact}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Owner info */}
          {hasOwnerInfo && (
            <div>
              <h3 className="mb-3 font-heading text-base font-semibold text-white">Owner</h3>
              <div className="space-y-1.5 text-sm text-white/75">
                {footer.ownerName && <p>{footer.ownerName}</p>}
                {footer.ownerContact && (
                  <p>
                    <a href={`tel:${footer.ownerContact}`} className="hover:text-white">
                      {footer.ownerContact}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Representative info */}
          {hasRepInfo && (
            <div>
              <h3 className="mb-3 font-heading text-base font-semibold text-white">Contact person</h3>
              <div className="space-y-1.5 text-sm text-white/75">
                {footer.representativeName && <p>{footer.representativeName}</p>}
                {footer.representativeContact && (
                  <p>
                    <a href={`tel:${footer.representativeContact}`} className="hover:text-white">
                      {footer.representativeContact}
                    </a>
                  </p>
                )}
                {footer.contactEmail && (
                  <p>
                    <a href={`mailto:${footer.contactEmail}`} className="hover:text-white">
                      {footer.contactEmail}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/20 pt-6 text-center text-xs text-white/40">
          <p>
            Anti-Scam PH — anti booking scam of resorts
          </p>
          <PoweredByMark compact className="opacity-90" />
          <p>
            Trusted resort booking platform
          </p>
        </div>
      </div>
    </footer>
  );
}
