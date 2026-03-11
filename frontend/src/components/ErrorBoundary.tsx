"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback to render instead of the default UI. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React error boundary — catches unhandled render errors and shows a
 * recovery UI instead of a blank screen.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console in development; could send to error tracking in prod
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-white p-6 dark:bg-zinc-950">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-900/30">
              !
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              An unexpected error occurred. Your work is safe — try refreshing
              the page or click the button below.
            </p>
            {this.state.error && (
              <details className="w-full rounded-lg border border-gray-200 p-3 text-left text-xs text-gray-400 dark:border-zinc-800 dark:text-zinc-500">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
