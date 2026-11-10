export function normalizeVietnameseMobilePhone(phone: string): string | null {
  const normalized = phone.trim().replace(/[\s().-]/g, "");
  return /^(?:0|\+84)(?:3[2-9]|5[25689]|7\d|8[1-9]|9[0-46-9])\d{7}$/.test(normalized)
    ? normalized
    : null;
}

export function isVietnameseMobilePhone(phone: string): boolean {
  return normalizeVietnameseMobilePhone(phone) !== null;
}
