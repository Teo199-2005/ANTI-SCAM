export const HOSPITALITY_LABELS: Record<string, string> = {
  hotel: "Hotel",
  resort: "Resort",
  staycation: "Staycation",
  villa: "Villa",
  condotel: "Condotel",
  beach_resort: "Beach resort",
  campsite: "Campsite",
  other: "Other",
};

export const AMENITY_LABELS: Record<string, string> = {
  airconditioned: "Air-conditioned",
  tv: "TV",
  netflix: "Netflix",
  refrigerator: "Refrigerator",
  heater: "Heater",
  wifi: "Wi-Fi",
  cctv: "CCTV",
  pet_allowed: "Pet allowed",
  private_pool: "Private pool",
  public_pool: "Public pool",
  jacuzzi: "Jacuzzi",
  beach_access: "Beach access",
  billiards: "Billiards",
  basketball_court: "Basketball court",
  videoke: "Videoke",
  soap: "Soap",
  shampoo: "Shampoo",
  breakfast: "Breakfast",
  restaurant: "Restaurant",
  store: "Store",
  parking: "Parking",
};

export const VERIFICATION_METHOD_LABELS: Record<string, string> = {
  video: "Live video verification",
  site_visit: "On-site visit",
  hybrid: "Hybrid (video + site visit)",
};

export const WIZARD_STEP_TITLES = [
  "Account & owner",
  "Business details",
  "Property profile",
  "Rooms & amenities",
  "Pricing",
  "Verification",
] as const;

export const WIZARD_STEP_DESCRIPTIONS: Record<number, string> = {
  1: "Answer a few questions about the resort owner. We use this for Anti-Scam PH verification and ownership records.",
  2: "Tell us whether your business is registered and share registration details if applicable.",
  3: "Describe your property, hospitality type, and where guests will find you.",
  4: "Add your resort branding, rooms, photos, and amenities guests can expect.",
  5: "Set weekday and weekend rates for each room before going live.",
  6: "Upload verification documents and choose how our team should confirm your property.",
};
