import { ProfileMediaEditorScreen } from "@/components/dashboard/profile-media/ProfileMediaEditorScreen";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default function ResortProfileMediaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-zinc-600">
          <Loader2 className="h-8 w-8 animate-spin text-primaryBlue" aria-hidden />
          <p className="font-dash text-sm">Opening editor…</p>
        </div>
      }
    >
      <ProfileMediaEditorScreen />
    </Suspense>
  );
}
