"use client";

import PageContainer from "@/components/layout/PageContainer";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import OwnerValuePropsStrip from "@/components/home/OwnerValuePropsStrip";
import { Building2, CheckCircle2, Clock3, Instagram, Mail, MapPin, MessageSquareMore, PhoneCall } from "lucide-react";
import { platformSocialLinks } from "@/lib/site";
import { sanitizeEmailTyping, sanitizeLongText, sanitizePersonName } from "@/lib/inputRestrictions";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("All fields are required.");
      return;
    }
    setPending(true);
    try {
      // Placeholder — replace with real API call when backend endpoint is ready
      await new Promise((res) => setTimeout(res, 800));
      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Unable to send your message. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <PageContainer className="section-padding">
      <SectionHeading title="Contact Us" subtitle="Reach our team for partnerships, support, or custom onboarding." />
      <div className="grid gap-6 md:grid-cols-2">
        <form className="soft-panel space-y-3 p-6" onSubmit={onSubmit} noValidate>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800">{error}</p>}
          {success && (
            <p role="status" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 size={14} />
              Message sent! We&apos;ll get back to you soon.
            </p>
          )}
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-xs font-semibold text-zinc-700">Full Name</label>
            <input
              id="contact-name"
              className="glass-field"
              placeholder="Maria Santos"
              value={name}
              onChange={(e) => setName(sanitizePersonName(e.target.value))}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1 block text-xs font-semibold text-zinc-700">Email Address</label>
            <input
              id="contact-email"
              className="glass-field"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())}
              required
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1 block text-xs font-semibold text-zinc-700">Message</label>
            <textarea
              id="contact-message"
              className="glass-field h-32"
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(sanitizeLongText(e.target.value, 4000))}
              required
            />
          </div>
          <Button type="submit" className="inline-flex items-center gap-2" disabled={pending}>
            <MessageSquareMore size={14} />
            {pending ? "Sending…" : "Send Message"}
          </Button>
        </form>
        <div className="soft-panel p-2">
          <div className="overflow-hidden rounded-xl border border-white/45 bg-white/30 shadow-inner backdrop-blur-md">
            <iframe
              title="Anti-Scam PH Tagaytay location map"
              src="https://www.google.com/maps?q=Tagaytay%20City%20Cavite&z=14&output=embed"
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card>
          <div className="glass-pill-icon">
            <PhoneCall size={16} />
          </div>
          <h3 className="font-heading text-xl text-zinc-900">General Support</h3>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-600">
            <Mail size={14} />
            support@antiscamph.com
          </p>
          <p className="text-sm text-zinc-600">0917-874-4889</p>
          <p className="text-sm text-zinc-600">(02) 8123 4567</p>
          <a
            href={platformSocialLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primaryBlue hover:underline"
          >
            <Instagram size={14} aria-hidden />
            @antiscamph on Instagram
          </a>
        </Card>
        <Card>
          <div className="glass-pill-icon">
            <Building2 size={16} />
          </div>
          <h3 className="font-heading text-xl text-zinc-900">Business Inquiries</h3>
          <p className="mt-3 text-sm text-zinc-600">partners@antiscamph.com</p>
          <p className="inline-flex items-center gap-2 text-sm text-zinc-600">
            <Clock3 size={14} />
            Mon-Sat, 8:00 AM - 8:00 PM
          </p>
        </Card>
        <Card>
          <div className="glass-pill-icon">
            <MapPin size={16} />
          </div>
          <h3 className="font-heading text-xl text-zinc-900">Address</h3>
          <p className="mt-3 text-sm text-zinc-600">Tagaytay City, Cavite</p>
          <p className="text-sm text-zinc-600">Philippines</p>
        </Card>
      </div>

      <div className="soft-panel mt-8 p-6">
        <h3 className="font-heading text-3xl text-zinc-900">Why resorts partner with us</h3>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          Before you write in, here&apos;s what operators get on day one — the same promises we ship to every onboarded resort.
        </p>
        <div className="mt-6">
          <OwnerValuePropsStrip variant="light" />
        </div>
      </div>

      <div className="soft-panel mt-8 p-6">
        <h3 className="font-heading text-3xl text-zinc-900">Quick Help</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/45 bg-white/40 p-4 shadow-sm backdrop-blur-md backdrop-saturate-150">
            <p className="font-semibold text-zinc-900">How fast is support response?</p>
            <p className="mt-1 text-sm text-zinc-600">Most booking and account concerns are replied to within 10 minutes during support hours.</p>
          </div>
          <div className="rounded-xl border border-white/45 bg-white/40 p-4 shadow-sm backdrop-blur-md backdrop-saturate-150">
            <p className="font-semibold text-zinc-900">Can resorts request onboarding help?</p>
            <p className="mt-1 text-sm text-zinc-600">Yes, our team can assist setup, listing structure, and dashboard orientation sessions.</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
