"use client";

import { ReactNode } from "react";

type AsyncStatePanelProps = {
  loading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingText?: string;
  emptyText?: string;
  emptyNode?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
  withinTable?: boolean;
  colSpan?: number;
};

function SkeletonRows({ colSpan }: { colSpan: number }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="flex gap-4">
              <div className="h-4 w-1/4 animate-pulse rounded-md bg-zinc-200" />
              <div className="h-4 w-1/3 animate-pulse rounded-md bg-zinc-200" />
              <div className="h-4 flex-1 animate-pulse rounded-md bg-zinc-200" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AsyncStatePanel({
  loading,
  error,
  isEmpty = false,
  loadingText,
  emptyText = "No records found.",
  emptyNode,
  onRetry,
  children,
  withinTable = false,
  colSpan = 1,
}: AsyncStatePanelProps) {
  const renderNode = (node: ReactNode, tone: "default" | "error" = "default") => {
    if (withinTable) {
      return (
        <tr>
          <td colSpan={colSpan} className={`p-8 text-center text-sm ${tone === "error" ? "text-sem-error" : "text-zinc-600"}`}>
            {node}
          </td>
        </tr>
      );
    }
    return <div className={`p-8 text-center text-sm ${tone === "error" ? "text-sem-error" : "text-zinc-600"}`}>{node}</div>;
  };

  if (loading) {
    if (withinTable) return <SkeletonRows colSpan={colSpan} />;
    if (loadingText) return renderNode(loadingText);
    return (
      <div className="flex justify-center p-8">
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return renderNode(
      <span>
        {error}
        {onRetry ? (
          <>
            {" "}
            <button type="button" onClick={onRetry} className="ml-2 underline hover:text-navy">
              Try again
            </button>
          </>
        ) : null}
      </span>,
      "error"
    );
  }
  if (isEmpty) {
    if (emptyNode && withinTable) {
      return (
        <tr>
          <td colSpan={colSpan} className="p-8 text-center text-sm text-zinc-600">{emptyNode}</td>
        </tr>
      );
    }
    if (emptyNode) return <div className="p-8 text-center text-sm text-zinc-600">{emptyNode}</div>;
    return renderNode(emptyText);
  }
  return <>{children}</>;
}
