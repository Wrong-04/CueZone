import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { type User } from "../types";
import { authService } from "../services/auth.service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  sendVerificationCode: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<void>;
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
    let active = true;
    localStorage.removeItem("cuezone_user");
    if (!authService.getToken()) {
      setLoading(false);
      return;
    }
    authService
      .getProfile()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) authService.logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password?: string): Promise<User> => {
    const result = await authService.login(email, password || "");
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    localStorage.setItem("cuezone_user", JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      const result = await authService.register(name, email, password, phone);
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      localStorage.setItem("cuezone_user", JSON.stringify(result.user));
      setUser(result.user);
    },
    [],
  );

  const sendVerificationCode = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      await authService.sendVerificationCode(name, email, password, phone);
    },
    [],
  );

  const verifyAndRegister = useCallback(async (email: string, code: string) => {
    const result = await authService.verifyAndRegister(email, code);
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    localStorage.setItem("cuezone_user", JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      sendVerificationCode,
      verifyAndRegister,
      logout,
    }),
    [user, loading, login, register, sendVerificationCode, verifyAndRegister, logout],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
