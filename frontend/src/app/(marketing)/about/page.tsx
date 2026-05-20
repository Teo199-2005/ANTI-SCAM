import VisionariesSection from "@/components/home/VisionariesSection";
import {
  AboutClosingBanner,
  AboutCompactList,
  AboutContentBand,
  AboutFeatureTile,
  AboutIntroHero,
  AboutSectionBreak,
  AboutStatusChips,
  AboutTileGrid,
} from "@/components/marketing/AboutPageSections";
import PageContainer from "@/components/layout/PageContainer";
import {
  aboutAdvocacyThemes,
  aboutCommitments,
  aboutCompany,
  aboutFilipinoVisionPriorities,
  aboutFreeOnboardingBenefits,
  aboutGrowthProgramGoals,
  aboutGuestBenefits,
  aboutLguInitiatives,
  aboutLguStakeholders,
  aboutPhilippineProblems,
  aboutPhilippineSupportGoals,
  aboutPlatformFeatures,
  aboutPropertyTypes,
  aboutResortBenefits,
  aboutVerificationStatuses,
} from "@/lib/aboutPageContent";
import {
  Building2,
  Flag,
  Gift,
  Globe2,
  Handshake,
  Landmark,
  LayoutGrid,
  Megaphone,
  Shield,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <>
      <div className="border-b border-clSeafoam/50 bg-gradient-to-b from-clSand/70 via-white to-white">
        <VisionariesSection />
      </div>

      <PageContainer className="section-padding space-y-8">
        <AboutIntroHero />

        <AboutSectionBreak label="Platform & access" />

        <AboutContentBand accent="platform" className="py-1">
        <AboutTileGrid>
          <AboutFeatureTile
            eyebrow="Platform"
            title="What we do"
            icon={LayoutGrid}
            branded
            cornerRibbon
            pillar="teal"
            iconHalo
            span={2}
            tone="sand"
          >
            <p className="font-medium text-zinc-700">
              More than a marketplace — a Philippine hospitality ecosystem.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-clOcean">Tools &amp; systems</p>
            <AboutCompactList items={aboutPlatformFeatures} columns={2} />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-clOcean">Property types</p>
            <AboutCompactList items={aboutPropertyTypes} columns={2} />
          </AboutFeatureTile>

          <AboutFeatureTile
            eyebrow="Accessibility"
            title="Free for Filipino businesses"
            icon={Gift}
            tone="light"
            pillar="ocean"
            iconHalo
          >
            <p>
              Onboarding is <strong className="font-bold text-[#0d1f3c]">FREE</strong> for Filipino-owned hospitality
              businesses — no expensive setup to go digital.
            </p>
            <AboutCompactList items={aboutFreeOnboardingBenefits} columns={1} />
          </AboutFeatureTile>

          <AboutFeatureTile
            eyebrow="Philippines"
            title="Built for the Philippines"
            icon={Globe2}
            branded
            pillar="teal"
          >
            <p>We address what guests still face nationwide:</p>
            <AboutCompactList items={aboutPhilippineProblems} columns={1} />
            <p className="mt-2 font-medium text-zinc-700">We support:</p>
            <AboutCompactList items={aboutPhilippineSupportGoals} columns={2} />
          </AboutFeatureTile>

          <AboutFeatureTile
            eyebrow="Trust"
            title="Verification status"
            icon={ShieldCheck}
            tone="sand"
            pillar="ocean"
            shieldArc
            iconHalo
          >
            <p>Clear labels on every listing — book with eyes open.</p>
            <AboutStatusChips items={aboutVerificationStatuses} />
          </AboutFeatureTile>
        </AboutTileGrid>
        </AboutContentBand>

        <AboutSectionBreak label="Guests & partners" variant="wave" />

        <AboutContentBand accent="guests" className="py-1" ecosystemBg>
        <AboutTileGrid>
          <AboutFeatureTile
            eyebrow="Guests"
            title="Why guests trust us"
            icon={Shield}
            pillar="teal"
            shieldArc
            iconHalo
          >
            <p>Safety, transparency, and accountability — built in.</p>
            <AboutCompactList items={aboutGuestBenefits} columns={1} />
          </AboutFeatureTile>

          <AboutFeatureTile
            eyebrow="Resort owners"
            title="Why resorts join"
            icon={Building2}
            tone="sand"
            pillar="ocean"
          >
            <p>Grow online with verification-backed credibility.</p>
            <AboutCompactList items={aboutResortBenefits} columns={1} />
          </AboutFeatureTile>

          <AboutFeatureTile
            eyebrow="LGUs"
            title="Supporting LGU digitalization"
            icon={Landmark}
            branded
            pillar="teal"
            iconHalo
          >
            <p>Tourism digitalization initiatives including:</p>
            <AboutCompactList items={aboutLguInitiatives} columns={1} />
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-clOcean">Ecosystem benefits</p>
            <AboutCompactList items={aboutLguStakeholders} columns={2} />
          </AboutFeatureTile>

          <AboutFeatureTile eyebrow="Program" title="Growth program" icon={TrendingUp} pillar="ocean">
            <p>Supporting active, legitimate onboarded businesses to encourage:</p>
            <AboutCompactList items={aboutGrowthProgramGoals} columns={1} />
          </AboutFeatureTile>
        </AboutTileGrid>
        </AboutContentBand>

        <AboutSectionBreak label="Advocacy & vision" />

        <AboutContentBand accent="advocacy" className="py-1">
        <AboutTileGrid>
          <AboutFeatureTile
            eyebrow="Advocacy"
            title="National advocacy"
            icon={Megaphone}
            tone="sand"
            pillar="gold"
          >
            <p>Safer, more transparent online hospitality — nationwide.</p>
            <AboutCompactList items={aboutAdvocacyThemes} columns={1} />
          </AboutFeatureTile>

          <AboutFeatureTile
            eyebrow="Filipino-owned"
            title="By Filipinos, for the PH"
            icon={Flag}
            branded
            pillar="teal"
          >
            <p>Prioritizing:</p>
            <AboutCompactList items={aboutFilipinoVisionPriorities} columns={1} />
          </AboutFeatureTile>

          <AboutFeatureTile
            eyebrow="Vision"
            title="Long-term vision"
            icon={Target}
            tone="navy"
            span={2}
            stampArc
            iconHalo
          >
            <p className="text-base font-medium leading-relaxed text-white/90">
              Build the largest verified hospitality network in the Philippines — helping local businesses enter the
              digital economy through technology, transparency, and trust.
            </p>
            <p className="mt-3 text-sm text-white/80">
              Guests book verified stays with confidence. Legitimate owners grow with modern systems.
            </p>
          </AboutFeatureTile>
        </AboutTileGrid>
        </AboutContentBand>

        <AboutClosingBanner />

        <AboutTileGrid>
          <AboutFeatureTile
            eyebrow="Commitment"
            title="What we stand for"
            icon={Handshake}
            tone="navy"
            span={2}
            fullRow
            stampArc
            pillar="gold"
          >
            <AboutCompactList items={aboutCommitments} columns={2} dark />
            <footer className="mt-5 border-t border-white/15 pt-5 text-center text-sm text-white/75">
              <p className="font-semibold text-white">{aboutCompany.legalName}</p>
              <p className="mt-1">
                {aboutCompany.founderTitle}: {aboutCompany.founderName}
              </p>
              <p className="mt-1">
                Platform: <span className="font-medium text-white/90">{aboutCompany.platformUrl}</span>
              </p>
            </footer>
          </AboutFeatureTile>
        </AboutTileGrid>

        <AboutSectionBreak label="Brand" />

        <section className="overflow-hidden rounded-2xl border border-clSeafoam/60 bg-gradient-to-br from-clSand via-white to-clSeafoam/25 shadow-cl-card">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-clSeafoam/50 px-5 py-5 md:px-7">
            <div>
              <span className="cl-section-eyebrow mb-2 inline-flex">Featured</span>
              <h3 className="font-heading text-2xl font-bold text-clOcean md:text-3xl">Brand poster</h3>
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="overflow-hidden rounded-xl border border-clSeafoam/60 bg-clSand">
              <Image
                src="/poster1.png"
                alt="Anti-Scam PH brand poster"
                width={1600}
                height={900}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </section>
      </PageContainer>
    </>
  );
}
