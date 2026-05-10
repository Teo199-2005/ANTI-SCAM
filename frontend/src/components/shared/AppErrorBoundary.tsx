"use client";

import React, { type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null };

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md p-10 text-center">
          <h1 className="font-heading text-2xl text-zinc-900">Something went wrong</h1>
          <p className="mt-3 text-sm text-zinc-600">Please refresh the page. If this keeps happening, contact support.</p>
          <button
            type="button"
            className="mt-6 rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
