import { verificationNeedsInternetAck } from "./validateStep6";

/**
 * Lightweight unit checks (run with: npx tsx src/lib/onboarding/validateStep6.test.ts)
 */
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(verificationNeedsInternetAck("video") === true, "video needs ack");
assert(verificationNeedsInternetAck("hybrid") === true, "hybrid needs ack");
assert(verificationNeedsInternetAck("site_visit") === false, "site_visit skips ack");
assert(verificationNeedsInternetAck("") === false, "empty method skips ack");

console.log("validateStep6: ok");
