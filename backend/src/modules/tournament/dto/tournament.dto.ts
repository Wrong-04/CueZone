import { TournamentStatus } from "../tournament.model";

export interface CreateTournamentDTO {
  name: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  registrationDeadline: string | Date;
  maxPlayers: number; // 8, 16, 32
  registrationFee?: number;
  prizePool?: string;
  firstPrize?: string;
  secondPrize?: string;
  thirdPrize?: string;
  rules?: string;
  format?: string;
  raceToScore?: number;
  assignedTables?: string[] | string;
}

export interface UpdateTournamentDTO extends Partial<CreateTournamentDTO> {}

export interface ChangeTournamentStatusDTO {
  status: TournamentStatus;
  note?: string;
}

export interface TournamentValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateTournamentData(
  dto: Partial<CreateTournamentDTO>,
  isUpdate: boolean = false
): TournamentValidationResult {
  const errors: string[] = [];

  if (!isUpdate || dto.name !== undefined) {
    if (!dto.name || !dto.name.trim()) {
      errors.push("Tên giải đấu không được để trống");
    }
  }

  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let regDeadline: Date | undefined;

  if (dto.startDate) {
    startDate = new Date(dto.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push("Ngày bắt đầu thi đấu không hợp lệ");
    }
  } else if (!isUpdate) {
    errors.push("Ngày bắt đầu thi đấu là bắt buộc");
  }

  if (dto.endDate) {
    endDate = new Date(dto.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push("Ngày kết thúc thi đấu không hợp lệ");
    }
  } else if (!isUpdate) {
    errors.push("Ngày kết thúc thi đấu là bắt buộc");
  }

  if (dto.registrationDeadline) {
    regDeadline = new Date(dto.registrationDeadline);
    if (isNaN(regDeadline.getTime())) {
      errors.push("Hạn đăng ký giải đấu không hợp lệ");
    }
  } else if (!isUpdate) {
    errors.push("Hạn chót đăng ký giải đấu là bắt buộc");
  }

  if (startDate && endDate && endDate < startDate) {
    errors.push("Ngày kết thúc thi đấu phải sau hoặc bằng ngày bắt đầu");
  }

  if (regDeadline && startDate && regDeadline > startDate) {
    errors.push("Hạn đăng ký phải trước hoặc bằng ngày bắt đầu thi đấu");
  }

  if (dto.maxPlayers !== undefined) {
    const allowedScales = [8, 16, 32];
    if (!allowedScales.includes(Number(dto.maxPlayers))) {
      errors.push("Quy mô số lượng cơ thủ chỉ hỗ trợ 8, 16 hoặc 32 cơ thủ");
    }
  } else if (!isUpdate) {
    errors.push("Quy mô số lượng cơ thủ tối đa là bắt buộc (8, 16 hoặc 32)");
  }

  if (dto.registrationFee !== undefined) {
    if (Number(dto.registrationFee) < 0) {
      errors.push("Lệ phí tham gia giải đấu không được âm");
    }
  }

  if (dto.raceToScore !== undefined) {
    if (Number(dto.raceToScore) < 1) {
      errors.push("Số ván chạm (Race to) phải lớn hơn hoặc bằng 1");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
