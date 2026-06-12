"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type AuthUser, type LoginDto, clearTokens, loadUser, saveUser, setTokens } from "./api";

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const cached = loadUser();
    if (cached) {
      setUser(cached);
      // Silently validate with /auth/me in background
      api.auth.me().then((fresh) => {
        setUser(fresh);
        saveUser(fresh);
      }).catch(() => {
        clearTokens();
        setUser(null);
      });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (dto: LoginDto) => {
    const tokens = await api.auth.login(dto);
    setTokens(tokens);
    const me = await api.auth.me();
    saveUser(me);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
