import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Banknote,
  BedDouble,
  Building2,
  Calendar,
  ClipboardCheck,
  DoorOpen,
  FileUp,
  Gift,
  Store,
  Hash,
  ImageIcon,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  MapPinned,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  Video,
  Wifi,
} from "lucide-react";

/** One icon per wizard step (header, intro, step nav). */
export const WIZARD_STEP_ICONS: LucideIcon[] = [
  UserRound,
  Building2,
  MapPin,
  BedDouble,
  Banknote,
  ShieldCheck,
];

export function wizardStepIcon(step: number): LucideIcon {
  return WIZARD_STEP_ICONS[Math.max(0, Math.min(5, step - 1))] ?? UserRound;
}

export const wizardFieldIcons = {
  user: UserRound,
  email: AtSign,
  phone: Phone,
  calendar: Calendar,
  tin: Hash,
  lock: LockKeyhole,
  address: MapPinned,
  business: Building2,
  businessStatus: Store,
  referral: Gift,
  property: Tag,
  hospitality: LayoutGrid,
  social: Share2,
  location: MapPin,
  logo: ImageIcon,
  amenities: Sparkles,
  rooms: DoorOpen,
  pricing: Banknote,
  verification: Video,
  documents: FileUp,
  internet: Wifi,
  certify: ClipboardCheck,
} as const;
