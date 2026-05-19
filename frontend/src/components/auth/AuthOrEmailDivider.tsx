import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
};

export function AuthOrEmailDivider({ className, label = "or use email" }: Props) {
  return (
    <div
      className={cn(
        "relative text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500",
        className,
      )}
    >
      <span className="relative z-10 bg-white px-3">{label}</span>
      <span className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-zinc-200/90" aria-hidden />
    </div>
  );
}
