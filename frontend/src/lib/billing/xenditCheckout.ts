/** True when URL is Xendit-hosted checkout (not an app success redirect). */
export function isXenditCheckoutUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "xendit.co" || host.endsWith(".xendit.co");
  } catch {
    return false;
  }
}
