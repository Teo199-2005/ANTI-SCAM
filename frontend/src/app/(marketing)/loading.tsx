import AppLoadingScreen from "@/components/layout/AppLoadingScreen";

/** Suspense fallback for marketing routes (required for `useSearchParams` during static generation). */
export default function MarketingLoading() {
  return <AppLoadingScreen />;
}
