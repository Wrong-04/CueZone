import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min } from "class-validator";
import { TableType } from "../table.model";

export class CreateTableDTO {
  @IsNotEmpty()
  @IsString()
  code!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEnum(TableType)
  type!: TableType;

  @IsNotEmpty()
  @IsString()
  area!: string;

  @IsOptional()
  @IsNumber()
  floor?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  pricePerHour!: number;
}

export class UpdateTableDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TableType)
  type?: TableType;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsNumber()
  floor?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTableStatusDTO {
  @IsNotEmpty()
  @IsString()
  status!: string;
}
