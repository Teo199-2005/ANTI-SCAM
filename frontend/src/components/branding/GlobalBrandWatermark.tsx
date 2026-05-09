import Image from "next/image";

export default function GlobalBrandWatermark() {
  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-10 select-none">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/50 px-2.5 py-1 shadow-sm backdrop-blur-sm">
        <Image
          src="/rising2brothers.png"
          alt="The Rising 2 Brothers"
          width={16}
          height={16}
          className="rounded-[2px] opacity-55"
        />
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Powered by: The Rising 2 Brothers
        </span>
      </div>
    </div>
  );
}
