import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { UserRole, type User } from "../types";
import { authService } from "../services/auth.service";
import {
  findSeedAccountByEmail,
  createMockUserFromSeed,
  type SeedAccount,
} from "../mock/seedData";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithSeed: (seed: SeedAccount) => void;
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

  // Khôi phục phiên đăng nhập từ localStorage khi reload trang
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("cuezone_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem("cuezone_user");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * =========================================================================
   * LOGIC ĐĂNG NHẬP API THỰC TẾ
   * (Tạm thời COMMENT LẠI theo yêu cầu người dùng để chuyển sang dùng SEED DATA)
   * =========================================================================
   */
  /*
  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    localStorage.setItem("cuezone_user", JSON.stringify(result.user));
    setUser(result.user);
  };
  */

  /**
   * =========================================================================
   * LOGIC ĐĂNG NHẬP BẰNG SEED DATA (MOCK TẠM THỜI)
   * =========================================================================
   */
  const login = async (email: string, _password?: string) => {
    // Giả lập network delay nhẹ (250ms) cho cảm giác mượt mà
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Tìm tài khoản trong danh sách Seed Data
    const matchedSeed = findSeedAccountByEmail(email);

    const targetUser: User = matchedSeed
      ? createMockUserFromSeed(matchedSeed)
      : {
          _id: `user_${Date.now()}`,
          name: email.split("@")[0] || "Cơ Thủ CueZone",
          email: email.trim(),
          role: email.includes("admin")
            ? UserRole.ADMIN
            : email.includes("staff")
            ? UserRole.STAFF
            : UserRole.CUSTOMER,
          phone: "0901234567",
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
          isActive: true,
          isLocked: false,
          branch: "CueZone Club - Chi nhánh 1",
          position: "Thành viên",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    const mockAccessToken = "seed_access_token_" + Date.now();
    const mockRefreshToken = "seed_refresh_token_" + Date.now();

    localStorage.setItem("accessToken", mockAccessToken);
    localStorage.setItem("refreshToken", mockRefreshToken);
    localStorage.setItem("cuezone_user", JSON.stringify(targetUser));
    setUser(targetUser);
  };

  /** Đăng nhập trực tiếp bằng 1 click từ danh sách Seed Data */
  const loginWithSeed = (seed: SeedAccount) => {
    const targetUser = createMockUserFromSeed(seed);
    const mockAccessToken = "seed_access_token_" + Date.now();
    const mockRefreshToken = "seed_refresh_token_" + Date.now();

    localStorage.setItem("accessToken", mockAccessToken);
    localStorage.setItem("refreshToken", mockRefreshToken);
    localStorage.setItem("cuezone_user", JSON.stringify(targetUser));
    setUser(targetUser);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const result = await authService.register(name, email, password, phone);
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    localStorage.setItem("cuezone_user", JSON.stringify(result.user));
    setUser(result.user);
  };

  const sendVerificationCode = async (name: string, email: string, password: string, phone?: string) => {
    await authService.sendVerificationCode(name, email, password, phone);
  };

  const verifyAndRegister = async (email: string, code: string) => {
    const result = await authService.verifyAndRegister(email, code);
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    localStorage.setItem("cuezone_user", JSON.stringify(result.user));
    setUser(result.user);
  };

  const logout = () => {
    // authService.logout(); // Tạm comment
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("cuezone_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithSeed,
        register,
        sendVerificationCode,
        verifyAndRegister,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
