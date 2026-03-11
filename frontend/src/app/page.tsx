"use client";

import { useAuth } from "@/hooks/useAuth";
import HomeClient from "@/components/HomeClient";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <HomeClient />;
}
