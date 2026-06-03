export type ResortLandingSurface = "odd" | "even";

/**
 * Document order on the public landing: rooms → reviews → (optional about) → map.
 * First band after the hero is "odd" (soft gray); each following section alternates to "even" (white).
 */
export function resortLandingSectionChain(opts: {
  hasAbout: boolean;
  hasRooms: boolean;
  hasMap: boolean;
  hasReviews?: boolean;
}): ("about" | "rooms" | "map" | "reviews")[] {
  const chain: ("about" | "rooms" | "map" | "reviews")[] = [];
  if (opts.hasRooms) chain.push("rooms");
  chain.push("reviews");
  if (opts.hasAbout) chain.push("about");
  if (opts.hasMap) chain.push("map");
  return chain;
}

export function resortLandingSurfaceFor(
  chain: readonly ("about" | "rooms" | "map" | "reviews")[],
  key: "about" | "rooms" | "map" | "reviews",
): ResortLandingSurface {
  const i = chain.indexOf(key);
  if (i < 0) return "odd";
  return i % 2 === 0 ? "odd" : "even";
}
