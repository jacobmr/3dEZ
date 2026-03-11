"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  const openLogin = () => {
    setAuthMode("login");
    setShowAuth(true);
  };
  const openRegister = () => {
    setAuthMode("register");
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-xl font-bold tracking-tight">3dEZ</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={openLogin}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Sign In
          </button>
          <button
            onClick={openRegister}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Describe it.{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            Print it.
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          3dEZ turns your ideas into 3D-printable designs through simple
          conversation. No CAD experience needed &mdash; just tell us what you
          want to make.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={openRegister}
            className="rounded-lg bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-xl"
          >
            Start Designing &mdash; Free
          </button>
          <button
            onClick={openLogin}
            className="rounded-lg border border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">How it works</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              1
            </div>
            <h3 className="mb-2 text-lg font-semibold">Describe your idea</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tell us what you need in plain English. &ldquo;I need a wall mount
              for my router&rdquo; is all it takes.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              2
            </div>
            <h3 className="mb-2 text-lg font-semibold">Refine interactively</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We ask smart questions about dimensions, mounting style, and
              features. Upload a photo for automatic measurements.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              3
            </div>
            <h3 className="mb-2 text-lg font-semibold">Download and print</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Preview your design in 3D, tweak dimensions with one click, and
              download a print-ready STL file.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Built for makers
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <FeatureCard
            title="Photo-to-dimensions"
            desc="Snap a photo of the space. Our AI estimates dimensions from reference objects like wall plates and USB ports."
          />
          <FeatureCard
            title="Instant 3D preview"
            desc="See your design in an interactive 3D viewer with dimension overlays. Rotate, zoom, and inspect before printing."
          />
          <FeatureCard
            title="Conversational refinement"
            desc="Say 'make it 5mm thicker' or 'add ventilation slots' and watch the design update in real time."
          />
          <FeatureCard
            title="Upload and modify STLs"
            desc="Already have an STL? Upload it and modify through conversation — add holes, cut slots, or resize."
          />
          <FeatureCard
            title="Design library"
            desc="Save designs to your personal library. Duplicate, create variants, and share with a link."
          />
          <FeatureCard
            title="Version history"
            desc="Every change is tracked. Compare versions side-by-side and revert to any previous iteration."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold">Ready to design?</h2>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Create your free account and start designing in seconds.
        </p>
        <button
          onClick={openRegister}
          className="rounded-lg bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-xl"
        >
          Create Free Account
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-6 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-600">
        &copy; {new Date().getFullYear()} 3dEZ. All rights reserved.
      </footer>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} initialMode={authMode} />
      )}
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-5 dark:border-gray-800">
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  );
}
