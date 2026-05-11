import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({ children, className }: Props) {
  return <div className={cn("mx-auto w-full max-w-7xl", className)}>{children}</div>;
}
