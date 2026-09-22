import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum } from "class-validator";

export class CreatePricingTierDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEnum(["weekday", "weekend", "peak"])
  dayType!: string;

  @IsNotEmpty()
  @IsString()
  startTime!: string;

  @IsNotEmpty()
  @IsString()
  endTime!: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];

  @IsNotEmpty()
  @IsNumber()
  standardPrice!: number;

  @IsNotEmpty()
  @IsNumber()
  vipPrice!: number;
}

export class UpdatePricingTierDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(["weekday", "weekend", "peak"])
  dayType?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsNumber()
  standardPrice?: number;

  @IsOptional()
  @IsNumber()
  vipPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
