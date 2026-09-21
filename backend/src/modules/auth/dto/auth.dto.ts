import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from "class-validator";
import { UserRole } from "../../user/user.model";

export class RegisterDTO {
  @IsNotEmpty({ message: "Tên không được để trống" })
  @IsString()
  name!: string;

  @IsEmail({}, { message: "Email không hợp lệ" })
  @IsNotEmpty({ message: "Email không được để trống" })
  email!: string;

  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự và phải bao gồm chữ thường và số" })
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDTO {
  @IsEmail({}, { message: "Email không hợp lệ" })
  @IsNotEmpty({ message: "Email không được để trống" })
  email!: string;

  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @IsString()
  password!: string;
}
