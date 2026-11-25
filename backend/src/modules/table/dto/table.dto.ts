import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsIn,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { TableEquipment, TableType } from "../table.model";

const EQUIPMENT_CONDITIONS = ["ok", "low", "broken"] as const;

// Vật tư ban đầu của bàn: mã tiếng Anh, UI hiển thị Đủ / Thiếu / Hư.
export class TableEquipmentDTO implements TableEquipment {
  @IsNumber()
  @Min(0)
  ballsSetCount!: number;

  @IsNumber()
  @Min(0)
  cueCount!: number;

  @IsNumber()
  @Min(0)
  chalkCount!: number;

  @IsNumber()
  @Min(0)
  triangleCount!: number;

  @IsNumber()
  @Min(0)
  glovesCount!: number;

  @IsIn(EQUIPMENT_CONDITIONS)
  feltCondition!: TableEquipment["feltCondition"];

  @IsIn(EQUIPMENT_CONDITIONS)
  lightCondition!: TableEquipment["lightCondition"];

  @IsOptional()
  @IsString()
  note?: string;
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => TableEquipmentDTO)
  equipment?: TableEquipmentDTO;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => TableEquipmentDTO)
  equipment?: TableEquipmentDTO;
}

export class UpdateTableStatusDTO {
  @IsNotEmpty()
  @IsString()
  status!: string;
}
