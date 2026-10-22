import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, Matches } from "class-validator";
import { UserRole } from "../../user/user.model";

export class RegisterDTO {
  @IsNotEmpty({ message: "Họ và tên không được để trống" })
  @IsString({ message: "Họ và tên phải là chuỗi ký tự" })
  name!: string;

  @IsEmail({}, { message: "Email không đúng định dạng" })
  @IsNotEmpty({ message: "Email không được để trống" })
  email!: string;

  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
  password!: string;

  @IsOptional()
  @Matches(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, {
    message: "Số điện thoại không đúng định dạng (VD: 0912345678 hoặc +84912345678)",
  })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDTO {
  @IsNotEmpty({ message: "Email hoặc số điện thoại không được để trống" })
  @IsString({ message: "Email hoặc số điện thoại phải là chuỗi ký tự" })
  email!: string;

  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @IsString({ message: "Mật khẩu phải là chuỗi ký tự" })
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ForgotPasswordDTO {
  @IsEmail({}, { message: "Email không đúng định dạng" })
  @IsNotEmpty({ message: "Email không được để trống" })
  email!: string;
}

export class ResetPasswordDTO {
  @IsEmail({}, { message: "Email không đúng định dạng" })
  @IsNotEmpty({ message: "Email không được để trống" })
  email!: string;

  @IsNotEmpty({ message: "Mã OTP không được để trống" })
  @IsString({ message: "Mã OTP phải là chuỗi ký tự" })
  code!: string;

  @IsNotEmpty({ message: "Mật khẩu mới không được để trống" })
  @MinLength(8, { message: "Mật khẩu mới phải có ít nhất 8 ký tự" })
  newPassword!: string;
}

export class ChangePasswordDTO {
  @IsNotEmpty({ message: "Mật khẩu hiện tại không được để trống" })
  @IsString()
  currentPassword!: string;

  @IsNotEmpty({ message: "Mật khẩu mới không được để trống" })
  @MinLength(8, { message: "Mật khẩu mới phải có ít nhất 8 ký tự" })
  newPassword!: string;
}

