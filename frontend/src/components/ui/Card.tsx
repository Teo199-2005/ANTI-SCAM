import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("soft-panel p-6", className)}>{children}</div>;
}
