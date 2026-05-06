export default function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/50 bg-white/45 px-3 py-1 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur-md backdrop-saturate-150">
      {text}
    </span>
  );
}
