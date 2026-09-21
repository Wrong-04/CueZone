import jwt from "jsonwebtoken";
import { User, IUser, UserRole } from "../user/user.model";
import { RegisterDTO, LoginDTO } from "./dto/auth.dto";
import { appConfig } from "../../config/app.config";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: Omit<IUser, "password">;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(dto: RegisterDTO): Promise<AuthResponse> {
    if (!dto.password || dto.password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
    }
    if (!/[a-zA-Z]/.test(dto.password) || !/[0-9]/.test(dto.password)) {
      throw new Error("Mật khẩu phải chứa cả chữ cái và số");
    }

    const existingUser = await User.findOne({ email: dto.email });
    if (existingUser) {
      throw new Error("Email đã được sử dụng");
    }

    const user = new User({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      role: dto.role || UserRole.CUSTOMER,
    });

    await user.save();

    const tokens = this.generateTokens(user);
    const userObj = user.toObject();
    delete (userObj as any).password;

    return { user: userObj as Omit<IUser, "password">, ...tokens };
  }

  async login(dto: LoginDTO): Promise<AuthResponse> {
    const user = await User.findOne({ email: dto.email }).select("+password");
    if (!user) {
      throw new Error("Email hoặc mật khẩu không chính xác");
    }

    if (user.isLocked) {
      throw new Error("Tài khoản đã bị khóa");
    }

    if (!user.isActive) {
      throw new Error("Tài khoản đã bị vô hiệu hóa");
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await user.comparePassword(dto.password);
    } catch {
      isPasswordValid = false;
    }
    if (!isPasswordValid && user.password === dto.password) {
      isPasswordValid = true;
    }
    if (!isPasswordValid) {
      throw new Error("Email hoặc mật khẩu không chính xác");
    }

    const tokens = this.generateTokens(user);
    const userObj = user.toObject();
    delete (userObj as any).password;

    return { user: userObj as Omit<IUser, "password">, ...tokens };
  }

  async getProfile(userId: string): Promise<Omit<IUser, "password">> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }
    return user;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret) as TokenPayload;
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error("Token không hợp lệ");
      }
      return this.generateTokens(user);
    } catch {
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
    }
  }

  private generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.expiresIn as any,
    });

    const refreshToken = jwt.sign(payload, appConfig.jwt.refreshSecret, {
      expiresIn: appConfig.jwt.refreshExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }
}
