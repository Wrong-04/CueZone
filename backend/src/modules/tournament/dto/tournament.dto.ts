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

function validatePrizeAmounts(dto: Partial<CreateTournamentDTO>): string[] {
  const errors: string[] = [];
  const amounts = ["firstPrize", "secondPrize", "thirdPrize"].map((key, index) => {
    const value = dto[key as "firstPrize" | "secondPrize" | "thirdPrize"];
    if (value === undefined || value === "") return undefined;
    const label = ["nhất", "nhì", "ba"][index];
    if (typeof value !== "string") {
      errors.push(`Giải ${label} phải là chuỗi mô tả tiền thưởng hoặc hiện vật`);
      return undefined;
    }
    if (!/\d/.test(value)) return undefined;
    // ponytail: số tiền VNĐ ở đầu mô tả, so sánh mỗi suất; tách trường amount nếu cần nhiều loại tiền.
    const match = value.trim().match(/^([+-]?(?:\d{1,3}(?:[., ]\d{3})+|\d+))\s*(?:VNĐ|VND|đồng|đ|₫)?\s*(?:$|\+|\(|[x×]\s*\d+\s*$)/iu);
    const amount = match ? Number(match[1].replace(/[., ]/g, "")) : NaN;
    if (!Number.isSafeInteger(amount) || amount < 0) {
      errors.push(`Tiền giải ${label} phải là số nguyên VNĐ không âm, đặt ở đầu mô tả (ví dụ: 5.000.000đ + Cúp)`);
      return undefined;
    }
    return amount;
  });
  for (let higher = 0; higher < amounts.length; higher++) {
    for (let lower = higher + 1; lower < amounts.length; lower++) {
      if (amounts[higher] !== undefined && amounts[lower] !== undefined && amounts[higher]! < amounts[lower]!) {
        const labels = ["nhất", "nhì", "ba"];
        errors.push(`Tiền giải ${labels[higher]} phải lớn hơn hoặc bằng tiền giải ${labels[lower]}`);
      }
    }
  }
  return errors;
}

export function validateTournamentData(
  dto: Partial<CreateTournamentDTO>,
  isUpdate: boolean = false,
): TournamentValidationResult {
  const errors = validatePrizeAmounts(dto);

  if (!isUpdate || dto.name !== undefined) {
    if (!dto.name || !dto.name.trim()) {
      errors.push("Tên giải đấu không được để trống");
    }
  }

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

  if (regDeadline && startDate && regDeadline >= startDate) {
    errors.push("Hạn đăng ký bắt buộc phải diễn ra trước ngày khai mạc giải đấu");
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
    const feeNum = Number(dto.registrationFee);
    if (isNaN(feeNum) || feeNum < 0 || !Number.isFinite(feeNum)) {
      errors.push("Lệ phí tham gia giải đấu phải là số dương hợp lệ hoặc bằng 0");
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
