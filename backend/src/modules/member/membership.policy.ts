export const MEMBER_EARN_POINTS_RATE = 10_000;

export const MEMBER_TIERS = [
  {
    key: "bronze",
    name: "Đồng",
    minPoints: 0,
    tableDiscountPercent: 5,
    fnbDiscountPercent: 0,
    benefits: ["Tích điểm từ hóa đơn chơi", "Đặt bàn trước qua ứng dụng"],
  },
  {
    key: "silver",
    name: "Bạc",
    minPoints: 500,
    tableDiscountPercent: 10,
    fnbDiscountPercent: 5,
    benefits: ["Giảm 10% tiền bàn", "Giảm 5% dịch vụ F&B", "Quà tặng sinh nhật"],
  },
  {
    key: "gold",
    name: "Vàng",
    minPoints: 1_500,
    tableDiscountPercent: 15,
    fnbDiscountPercent: 10,
    benefits: ["Giảm 15% tiền bàn", "Ưu tiên giữ bàn giờ cao điểm", "Tủ để cơ riêng"],
  },
] as const;

export function getMemberTier(points: number) {
  let tierIndex = 0;
  for (let index = 1; index < MEMBER_TIERS.length; index += 1) {
    if (points < MEMBER_TIERS[index].minPoints) break;
    tierIndex = index;
  }
  const tier = MEMBER_TIERS[tierIndex];
  const nextTier = MEMBER_TIERS[tierIndex + 1];
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.floor(
          ((points - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100,
        ),
      )
    : 100;

  return {
    tier,
    nextTier: nextTier ?? null,
    pointsToNextTier: nextTier ? Math.max(0, nextTier.minPoints - points) : 0,
    progressPercent,
  };
}

export function getPointsForSpend(amount: number) {
  return Math.floor(amount / MEMBER_EARN_POINTS_RATE);
}
