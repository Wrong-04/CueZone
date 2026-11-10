export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}

export function normalizeVietnameseMobilePhone(value: unknown): string | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const phone = String(value).trim();
  const compact = phone.replace(/[\s().-]/g, "");
  const isLocalMobile = /^0[35789]\d{8}$/.test(compact);
  const isInternationalMobile = /^\+84[35789]\d{8}$/.test(compact);
  if (!isLocalMobile && !isInternationalMobile) {
    throw new Error(
      "Số điện thoại phải là số di động Việt Nam hợp lệ (VD: 0912345678 hoặc +84912345678)",
    );
  }
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
}

export function phonePatterns(value: string) {
  const localDigits = normalizePhone(value);
  if (!localDigits) return [];
  const variants = [localDigits];
  if (localDigits.startsWith("0")) variants.push(`84${localDigits.slice(1)}`);
  return variants.map((digits) => {
    const formattedDigits = digits.split("").join("[\\s().-]*");
    return `^${digits.startsWith("84") ? "\\+?" : ""}${formattedDigits}$`;
  });
}
