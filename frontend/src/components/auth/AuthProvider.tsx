"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { setAccessToken, clearAccessToken } from "@/lib/auth";
import {
  authLogin,
  authRegister,
  authRefresh,
  authMe,
  authLogout,
} from "@/lib/api";
import { AuthContext, type AuthUser } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try silent refresh on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authRefresh();
        if (!cancelled) {
          setAccessToken(data.access_token);
          const me = await authMe();
          setUser(me);
        }
      } catch {
        // No valid refresh token — stay anonymous
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authLogin(email, password);
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await authRegister(email, password);
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    authLogout().catch(() => {});
  }, []);

  return (
    <AuthContext
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}
