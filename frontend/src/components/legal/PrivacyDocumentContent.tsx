"use client";

import { useLegalDocuments } from "@/contexts/LegalDocumentModalsContext";

/** Privacy policy copy (shown inside the privacy modal). */
export function PrivacyDocumentContent() {
  const { openTerms } = useLegalDocuments();

  return (
    <div className="space-y-8 text-sm leading-relaxed text-zinc-700">
      <section>
        <h2 className="font-heading text-lg font-semibold text-navy">Information we process</h2>
        <p className="mt-3">
          We process account details you provide (such as name, email, and phone), resort and listing content you upload,
          reservation and billing records needed to operate the service, and technical logs that help us secure and improve
          the platform.
        </p>
      </section>
      <section>
        <h2 className="font-heading text-lg font-semibold text-navy">How we use it</h2>
        <p className="mt-3">
          Data is used to provide reservation management, verification workflows, customer support, fraud prevention, and
          legally required reporting. We do not sell personal data to third parties.
        </p>
      </section>
      <section>
        <h2 className="font-heading text-lg font-semibold text-navy">Retention & security</h2>
        <p className="mt-3">
          We retain information as long as your account is active or as needed for legitimate business and legal obligations.
          We apply reasonable technical and organizational measures to protect data; no online service can guarantee perfect
          security.
        </p>
      </section>
      <section>
        <h2 className="font-heading text-lg font-semibold text-navy">Your choices</h2>
        <p className="mt-3">
          You may request access, correction, or deletion of certain personal data where applicable law allows. Contact us
          using the details below. Platform use is also governed by our{" "}
          <button
            type="button"
            onClick={() => openTerms()}
            className="font-semibold text-clOcean underline decoration-clOcean/40 underline-offset-2 hover:text-clOceanHover"
          >
            Terms &amp; Conditions
          </button>
          .
        </p>
      </section>
      <section>
        <h2 className="font-heading text-lg font-semibold text-navy">Contact</h2>
        <p className="mt-3">
          Email:{" "}
          <a href="mailto:support@anti-scamph.com" className="font-semibold text-clOcean hover:underline">
            support@anti-scamph.com
          </a>
          <br />
          Website:{" "}
          <a href="https://anti-scamph.com" className="font-semibold text-clOcean hover:underline">
            anti-scamph.com
          </a>
        </p>
      </section>
    </div>
  );
}
