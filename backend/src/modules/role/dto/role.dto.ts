import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class PermissionDTO {
  @IsNotEmpty()
  @IsString()
  module!: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  actions!: string[];
}

export class CreateRoleDTO {
  @IsNotEmpty({ message: "Tên role không được để trống" })
  @IsString()
  name!: string;

  @IsNotEmpty({ message: "Tên hiển thị không được để trống" })
  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDTO)
  permissions?: PermissionDTO[];
}

export class UpdateRoleDTO {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDTO)
  permissions?: PermissionDTO[];
}

export class UpdateUserRoleDTO {
  @IsNotEmpty()
  @IsString()
  role!: string;
}
