import jwt from "jsonwebtoken";
import { User, IUser, UserRole } from "../user/user.model";
import { RegisterDTO, LoginDTO } from "./dto/auth.dto";
import { appConfig } from "../../config/app.config";
import { EmailVerification } from "./emailVerification.model";
import { sendVerificationEmail } from "./email.service";

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
  private sendingLocks = new Set<string>();

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

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error("Mật khẩu phải chứa cả chữ cái và số");
    }
  }

  async sendVerificationCode(dto: RegisterDTO): Promise<{ message: string }> {
    this.validatePassword(dto.password);

    const lockKey = dto.email.toLowerCase();
    if (this.sendingLocks.has(lockKey)) {
      throw new Error("Đang xử lý yêu cầu gửi mã, vui lòng thử lại sau giây lát");
    }
    this.sendingLocks.add(lockKey);

    try {
      const existingUser = await User.findOne({ email: dto.email });
      if (existingUser) {
        throw new Error("Email đã được sử dụng");
      }

      const pending = await EmailVerification.findOne({ email: dto.email });
      if (pending) {
        const elapsed = Date.now() - pending.updatedAt.getTime();
        if (elapsed < 60_000) {
          const wait = Math.ceil((60_000 - elapsed) / 1000);
          throw new Error(`Vui lòng chờ ${wait} giây trước khi yêu cầu mã mới`);
        }
      }

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await EmailVerification.findOneAndUpdate(
        { email: dto.email },
        {
          email: dto.email,
          code,
          name: dto.name,
          password: dto.password,
          phone: dto.phone,
          attempts: 0,
          expiresAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      try {
        await sendVerificationEmail(dto.email, code, dto.name);
      } catch (err) {
        await EmailVerification.deleteOne({ email: dto.email });
        console.error("❌ Email send failed:", err);
        throw new Error(
          "Không thể gửi email xác minh. Vui lòng cấu hình App Password Gmail (SMTP_PASS) và thử lại."
        );
      }

      console.log(`📧 Verification code for ${dto.email}: ${code}`);
      return { message: "Mã xác minh đã được gửi" };
    } finally {
      this.sendingLocks.delete(lockKey);
    }
  }

  async verifyAndRegister(email: string, code: string): Promise<AuthResponse> {
    const pending = await EmailVerification.findOne({ email });
    if (!pending) {
      throw new Error("Không tìm thấy yêu cầu xác minh. Vui lòng yêu cầu mã mới.");
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      await EmailVerification.deleteOne({ email });
      throw new Error("Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.");
    }

    pending.attempts += 1;
    if (pending.attempts > 5) {
      await EmailVerification.deleteOne({ email });
      throw new Error("Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
    }

    if (pending.code !== String(code ?? "").trim()) {
      await pending.save();
      const remain = 5 - pending.attempts;
      throw new Error(`Mã xác minh không chính xác. Còn ${remain} lần thử.`);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await EmailVerification.deleteOne({ email });
      throw new Error("Email đã được sử dụng");
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      phone: pending.phone,
      role: UserRole.CUSTOMER,
    });
    await user.save();
    await EmailVerification.deleteOne({ email });

    const tokens = this.generateTokens(user);
    const userObj = user.toObject();
    delete (userObj as any).password;

    return { user: userObj as Omit<IUser, "password">, ...tokens };
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
