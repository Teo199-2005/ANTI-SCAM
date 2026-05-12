export type ResortLandingSurface = "odd" | "even";

/** First band after the hero is “odd” (soft gray); each following section alternates to “even” (white). */
export function resortLandingSectionChain(opts: {
  hasAbout: boolean;
  hasRooms: boolean;
  hasMap: boolean;
}): ("about" | "rooms" | "overview" | "map")[] {
  const chain: ("about" | "rooms" | "overview" | "map")[] = [];
  if (opts.hasAbout) chain.push("about");
  if (opts.hasRooms) chain.push("rooms");
  chain.push("overview");
  if (opts.hasMap) chain.push("map");
  return chain;
}

export function resortLandingSurfaceFor(
  chain: readonly ("about" | "rooms" | "overview" | "map")[],
  key: "about" | "rooms" | "overview" | "map",
): ResortLandingSurface {
  const i = chain.indexOf(key);
  if (i < 0) return "odd";
  return i % 2 === 0 ? "odd" : "even";
}
