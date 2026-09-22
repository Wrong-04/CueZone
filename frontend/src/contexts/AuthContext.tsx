import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "../types";
import { authService } from "../services/auth.service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  sendVerificationCode: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  verifyAndRegister: (email: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    setUser(result.user);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const result = await authService.register(name, email, password, phone);
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    setUser(result.user);
  };

  const sendVerificationCode = async (name: string, email: string, password: string, phone?: string) => {
    await authService.sendVerificationCode(name, email, password, phone);
  };

  const verifyAndRegister = async (email: string, code: string) => {
    const result = await authService.verifyAndRegister(email, code);
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    setUser(result.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, sendVerificationCode, verifyAndRegister, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
