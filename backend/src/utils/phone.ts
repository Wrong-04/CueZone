export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}

export function phonePattern(value: string): string | null {
  const local = normalizePhone(value);
  if (local.length < 8) return null;
  const variants = [local];
  if (local.startsWith("0")) variants.push(`84${local.slice(1)}`);
  return `^(?:${variants
    .map((digits) => `${digits.startsWith("84") ? "\\+?" : ""}${digits.split("").join("[\\s().-]*")}`)
    .join("|")})$`;
}
