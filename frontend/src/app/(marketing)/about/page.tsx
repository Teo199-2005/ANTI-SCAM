import PageContainer from "@/components/layout/PageContainer";
import Card from "@/components/ui/Card";
import SectionHeading from "@/components/ui/SectionHeading";
import VisionariesSection from "@/components/home/VisionariesSection";
import {
  Award,
  CalendarCheck2,
  Flag,
  Gem,
  MessageSquareOff,
  Settings2,
  Target,
  Zap,
} from "lucide-react";

const pillars = [
  {
    icon: Target,
    title: "Mission",
    description: "Help resorts operate with clarity while giving guests a transparent, stress-free reservation journey."
  },
  {
    icon: Flag,
    title: "Vision",
    description: "Become the most trusted booking operating system for premium staycations in the Philippines."
  },
  {
    icon: Gem,
    title: "Values",
    description: "Reliability, guest-first communication, operational accuracy, and long-term platform trust."
  }
];

const milestones = [
  "Launched unified dashboards so owners simplify property management from one place",
  "Shipped branded public listings and verified flows to legitimize staycation businesses",
  "Added real-time locks and availability so double bookings stopped cold",
  "Refined the guest path so easy booking became the default — fewer drop-offs, clearer fees",
  "Put policies and pricing on-page so redundant inquiries dropped and teams stayed focused"
];

const problemsWeSolve = [
  {
    icon: Settings2,
    title: "Simplify your property management",
    pain: "Spreadsheets, DMs, and disconnected tools create chaos.",
    solution: "Rooms, calendar, reservations, and guest context live in one dashboard built for small resort teams."
  },
  {
    icon: Award,
    title: "Legitimize your resort or staycation business",
    pain: "Guests hesitate when booking feels informal or unclear.",
    solution: "A professional listing, transparent fees, and a guided checkout build trust like a serious operator."
  },
  {
    icon: CalendarCheck2,
    title: "No more double bookings",
    pain: "Manual calendars sell the same night twice under pressure.",
    solution: "Availability and time-limited locks sync instantly so a sold night is gone from the book immediately."
  },
  {
    icon: Zap,
    title: "Easy booking",
    pain: "Long forms and vague steps make guests abandon halfway.",
    solution: "A short, guided flow from dates to ₱500 confirmation keeps momentum and reduces support ping-pong."
  },
  {
    icon: MessageSquareOff,
    title: "No more annoying redundant inquiries",
    pain: "The same five questions repeat in chat all day.",
    solution: "Self-serve listing content answers availability, policy, and pricing before anyone has to message you."
  }
];

export default function AboutPage() {
  return (
    <>
      <PageContainer className="section-padding">
        <SectionHeading title="About Us" subtitle="We design serene stays and trustworthy booking experiences for modern travelers." />
        <div className="soft-panel p-6">
          <p className="leading-7 text-zinc-600">
            Anti-Scam PH exists to help resorts operate with confidence and give guests a seamless path from discovery to confirmed reservation.
            Our platform combines elegant design with reliable booking logic tailored for hospitality teams.
          </p>
        </div>

        <div className="mt-14">
          <SectionHeading
            title="Problems We Solve"
            subtitle="Five pain points we hear from resort and staycation operators — and how Anti-Scam PH removes them."
          />
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {problemsWeSolve.map((item) => (
            <Card key={item.title}>
              <div className="glass-pill-icon">
                <item.icon size={18} />
              </div>
              <h3 className="mt-3 font-heading text-xl text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-sm font-medium text-rose-800/90">Pain: {item.pain}</p>
              <p className="mt-2 text-sm text-zinc-600">We fix it: {item.solution}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Card key={pillar.title}>
              <div className="glass-pill-icon">
                <pillar.icon size={18} />
              </div>
              <h3 className="font-heading text-xl text-zinc-900">{pillar.title}</h3>
              <p className="mt-3 text-sm text-zinc-600">{pillar.description}</p>
            </Card>
          ))}
        </div>

        <div className="soft-panel mt-8 p-6">
          <h3 className="font-heading text-3xl text-zinc-900">Our Journey</h3>
          <ul className="mt-4 space-y-3">
            {milestones.map((milestone) => (
              <li key={milestone} className="flex items-start gap-3 text-zinc-600">
                <span className="mt-2 inline-block h-2 w-2 rounded-full bg-zinc-900" />
                <span>{milestone}</span>
              </li>
            ))}
          </ul>
        </div>
      </PageContainer>
      <div className="border-y border-white/30 bg-gradient-to-b from-zinc-100/90 via-white/55 to-zinc-50/85 backdrop-blur-md">
        <VisionariesSection />
      </div>
    </>
  );
}
