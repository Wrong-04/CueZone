import jwt from "jsonwebtoken";
import { User, IUser, UserRole } from "../user/user.model";
import { Role, IPermission } from "../role/role.model";
import { RegisterDTO, LoginDTO } from "./dto/auth.dto";
import { appConfig } from "../../config/app.config";
import { EmailVerification } from "./emailVerification.model";
import { sendVerificationEmail } from "./email.service";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export type UserPlain = {
  _id: any;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isLocked: boolean;
  branch?: string;
  position?: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface UserWithPermissions extends UserPlain {
  permissions?: IPermission[];
}

export interface AuthResponse {
  user: UserWithPermissions;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private sendingLocks = new Set<string>();

  private async getRolePermissions(roleName: string): Promise<IPermission[]> {
    try {
      const roleDoc = await Role.findOne({ name: roleName.toLowerCase() });
      return roleDoc?.permissions || [];
    } catch {
      return [];
    }
  }

  private validateRegistrationInput(dto: RegisterDTO): { name: string; email: string; phone?: string; password: string } {
    const name = typeof dto.name === "string" ? dto.name.trim() : "";
    if (!name) {
      throw new Error("Họ và tên không được để trống");
    }

    const email = typeof dto.email === "string" ? dto.email.trim().toLowerCase() : "";
    if (!email) {
      throw new Error("Email không được để trống");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Email không đúng định dạng");
    }

    let phone: string | undefined = undefined;
    if (dto.phone !== undefined && dto.phone !== null && String(dto.phone).trim() !== "") {
      phone = String(dto.phone).trim();
      const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!phoneRegex.test(phone)) {
        throw new Error("Số điện thoại không đúng định dạng (VD: 0912345678 hoặc +84912345678)");
      }
    }

    this.validatePassword(dto.password);

    return { name, email, phone, password: dto.password };
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error("Mật khẩu phải chứa cả chữ cái và số");
    }
  }

  async register(dto: RegisterDTO): Promise<AuthResponse> {
    const validated = this.validateRegistrationInput(dto);

    const existingEmail = await User.findOne({ email: validated.email });
    if (existingEmail) {
      throw new Error("Email đã được sử dụng");
    }

    if (validated.phone) {
      const existingPhone = await User.findOne({ phone: validated.phone });
      if (existingPhone) {
        throw new Error("Số điện thoại đã được sử dụng");
      }
    }

    const user = new User({
      name: validated.name,
      email: validated.email,
      password: validated.password,
      phone: validated.phone,
      role: UserRole.CUSTOMER,
    });

    await user.save();

    const tokens = this.generateTokens(user);
    const userObj = user.toObject();
    delete (userObj as any).password;
    const permissions = await this.getRolePermissions(user.role);

    return { user: { ...userObj, permissions } as UserWithPermissions, ...tokens };
  }

  async login(dto: LoginDTO): Promise<AuthResponse> {
    const rawIdentifier = dto?.email || dto?.phone || "";
    const identifier = typeof rawIdentifier === "string" ? rawIdentifier.trim() : "";
    const password = typeof dto?.password === "string" ? dto.password : "";

    if (!identifier || !password) {
      throw new Error("Email/số điện thoại và mật khẩu không được để trống");
    }

    const isEmail = identifier.includes("@");
    const user = await User.findOne(
      isEmail
        ? { email: identifier.toLowerCase() }
        : { $or: [{ phone: identifier }, { email: identifier.toLowerCase() }] }
    ).select("+password");

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
      isPasswordValid = await user.comparePassword(password);
    } catch {
      isPasswordValid = false;
    }
    if (!isPasswordValid) {
      throw new Error("Email hoặc mật khẩu không chính xác");
    }

    const tokens = this.generateTokens(user);
    const userObj = user.toObject();
    delete (userObj as any).password;
    const permissions = await this.getRolePermissions(user.role);

    return { user: { ...userObj, permissions } as UserWithPermissions, ...tokens };
  }

  async getProfile(userId: string): Promise<UserWithPermissions> {
    const user = await User.findById(userId);
    if (!user || !user.isActive || user.isLocked) {
      throw new Error("Tài khoản không còn hoạt động");
    }
    const userObj = user.toObject();
    delete (userObj as any).password;
    const permissions = await this.getRolePermissions(user.role);
    return { ...userObj, permissions } as UserWithPermissions;
  }

  async sendVerificationCode(dto: RegisterDTO): Promise<{ message: string }> {
    const validated = this.validateRegistrationInput(dto);

    const lockKey = validated.email;
    if (this.sendingLocks.has(lockKey)) {
      throw new Error("Đang xử lý yêu cầu gửi mã, vui lòng thử lại sau giây lát");
    }
    this.sendingLocks.add(lockKey);

    try {
      const existingUser = await User.findOne({ email: validated.email });
      if (existingUser) {
        throw new Error("Email đã được sử dụng");
      }

      if (validated.phone) {
        const existingPhone = await User.findOne({ phone: validated.phone });
        if (existingPhone) {
          throw new Error("Số điện thoại đã được sử dụng");
        }
      }

      const pending = await EmailVerification.findOne({ email: validated.email });
      if (pending) {
        const elapsed = Date.now() - pending.updatedAt.getTime();
        if (elapsed < 60_000) {
          const wait = Math.ceil((60_000 - elapsed) / 1000);
          throw new Error(`Vui lòng chờ ${wait} giây trước khi yêu cầu mã mới`);
        }
      }

      // Mã OTP 6 chữ số ngẫu nhiên
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await EmailVerification.findOneAndUpdate(
        { email: validated.email },
        {
          email: validated.email,
          code,
          name: validated.name,
          password: validated.password,
          phone: validated.phone,
          attempts: 0,
          expiresAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      try {
        await sendVerificationEmail(validated.email, code, validated.name);
      } catch (err) {
        await EmailVerification.deleteOne({ email: validated.email });
        console.error("❌ Email send failed:", err);
        throw new Error(
          "Không thể gửi email xác minh. Vui lòng cấu hình App Password Gmail (SMTP_PASS) và thử lại."
        );
      }

      console.log(`📧 Verification code for ${validated.email}: ${code}`);
      return { message: "Mã xác minh đã được gửi" };
    } finally {
      this.sendingLocks.delete(lockKey);
    }
  }

  async verifyAndRegister(email: string, code: string): Promise<AuthResponse> {
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const pending = await EmailVerification.findOne({ email: normalizedEmail });
    if (!pending) {
      throw new Error("Không tìm thấy yêu cầu xác minh. Vui lòng yêu cầu mã mới.");
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      await EmailVerification.deleteOne({ email: normalizedEmail });
      throw new Error("Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.");
    }

    pending.attempts += 1;
    if (pending.attempts > 5) {
      await EmailVerification.deleteOne({ email: normalizedEmail });
      throw new Error("Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
    }

    if (pending.code !== String(code ?? "").trim()) {
      await pending.save();
      const remain = 5 - pending.attempts;
      throw new Error(`Mã xác minh không chính xác. Còn ${remain} lần thử.`);
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      await EmailVerification.deleteOne({ email: normalizedEmail });
      throw new Error("Email đã được sử dụng");
    }

    if (pending.phone) {
      const existingPhone = await User.findOne({ phone: pending.phone });
      if (existingPhone) {
        await EmailVerification.deleteOne({ email: normalizedEmail });
        throw new Error("Số điện thoại đã được sử dụng");
      }
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      phone: pending.phone,
      role: UserRole.CUSTOMER,
    });
    await user.save();
    await EmailVerification.deleteOne({ email: normalizedEmail });

    const tokens = this.generateTokens(user);
    const userObj = user.toObject();
    delete (userObj as any).password;
    const permissions = await this.getRolePermissions(user.role);

    return { user: { ...userObj, permissions } as UserWithPermissions, ...tokens };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret) as TokenPayload;
    } catch {
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("Tài khoản không tồn tại");
    }
    if (user.isLocked) {
      throw new Error("Tài khoản đã bị khóa");
    }
    if (!user.isActive) {
      throw new Error("Tài khoản đã bị vô hiệu hóa");
    }

    return this.generateTokens(user);
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
