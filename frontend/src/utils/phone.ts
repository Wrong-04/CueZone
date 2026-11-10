const VIETNAMESE_MOBILE_PHONE = /^(?:0[35789]\d{8}|\+84[35789]\d{8})$/;

export function isVietnameseMobilePhone(value: string): boolean {
  return VIETNAMESE_MOBILE_PHONE.test(value.trim().replace(/[\s().-]/g, ""));
}
