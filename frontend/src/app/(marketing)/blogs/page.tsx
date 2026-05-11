"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import PageContainer from "@/components/layout/PageContainer";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import { blogs } from "@/lib/content/blogs";
import { BookOpen, Building2, ChevronRight, Clock3, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const ALL_TAG = "All";
const TAGS = [ALL_TAG, "Guest Experience", "Revenue Strategy", "Product & UX", "Resort Operations"];

export default function BlogsPage() {
  const [activeTag, setActiveTag] = useState(ALL_TAG);
  const filtered = activeTag === ALL_TAG ? blogs : blogs.filter((b) => b.category === activeTag);

  return (
    <PageContainer className="section-padding">
      <SectionHeading title="Blogs" subtitle="Travel insights, resort operations tips, and guest experience ideas." />
      <div className="mb-6 flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(tag)}
            className={`glass-tag transition ${activeTag === tag ? "bg-navy/10 font-semibold text-navy ring-1 ring-navy/20" : "hover:bg-zinc-100"}`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {filtered.map((blog) => (
          <Card key={blog.slug}>
            <div className="glass-tag inline-flex items-center gap-2 uppercase tracking-wide text-zinc-500">
              <BookOpen size={13} />
              {blog.category}
            </div>
            <h3 className="font-heading text-xl text-zinc-900">{blog.title}</h3>
            <p className="mt-3 text-zinc-600">{blog.excerpt}</p>
            <div className="mt-4 space-y-1 text-xs text-zinc-500">
              <p className="inline-flex flex-wrap items-center gap-2">
                <UserRound size={13} />
                {blog.author === "Anti-Scam PH Editorial" ? (
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    <BrandWordmark tone="onLight" size="2xs" className="inline" />
                    <span>Editorial</span>
                  </span>
                ) : (
                  blog.author
                )}
              </p>
              <p className="inline-flex items-center gap-2">
                <Clock3 size={13} />
                {blog.publishedAt} • {blog.readTime}
              </p>
            </div>
            <div className="mt-4">
              <Link href={`/blogs/${blog.slug}`}>
                <Button variant="outline">Read Article</Button>
              </Link>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-3 py-12 text-center text-zinc-500">No articles in this category yet.</p>
        )}
      </div>

      <div className="soft-panel mt-10 border border-navy/10 bg-gradient-to-br from-navy/5 via-white/60 to-slateBlue/5 p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="glass-pill-icon shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-heading text-2xl text-zinc-900 md:text-3xl">Running a resort or staycation?</h3>
              <p className="mt-2 max-w-xl text-zinc-600">
                See how we help owners simplify operations, look professional to guests, and end double bookings and inbox noise.
              </p>
            </div>
          </div>
          <Link
            href="/about"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full border border-white/30 bg-gradient-to-r from-slateBlue/90 to-navy/90 px-6 py-3 text-sm font-semibold text-white shadow-soft backdrop-blur-md transition hover:from-slateBlue hover:to-navy md:w-auto"
          >
            How we help owners
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="soft-panel mt-10 p-6">
        <h3 className="font-heading text-3xl text-zinc-900">Get new resort insights in your inbox</h3>
        <p className="mt-2 text-zinc-600">Monthly updates on guest experience, booking conversion, and operations strategy.</p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <label htmlFor="blog-subscribe-email" className="sr-only">Email address</label>
          <input id="blog-subscribe-email" className="glass-field" placeholder="Email address" type="email" />
          <Button className="inline-flex items-center gap-2">
            <Mail size={14} />
            Subscribe
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
