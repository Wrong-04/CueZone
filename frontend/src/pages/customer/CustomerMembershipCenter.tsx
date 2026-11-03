import { useEffect, useState } from "react";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  GiftOutlined,
  StarOutlined,
  StarFilled,
  TableOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Card, Input, message, Pagination, Tag, Typography } from "../../shared/ui";
import {
  membershipService,
  type MembershipOverview,
  type PlayHistoryItem,
} from "../../services/membership.service";

const { Text, Title } = Typography;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));

const paymentLabels: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  vnpay: "VNPay",
  card: "Thẻ",
  member_balance: "Ví hội viên",
};

const RatingStars = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div>
    <div className="mb-1.5 text-xs font-semibold text-slate-700">{label}</div>
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          aria-label={`${rating} sao`}
          aria-pressed={value === rating}
          className="rounded p-1 text-xl text-amber-400 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          {rating <= value ? <StarFilled /> : <StarOutlined />}
        </button>
      ))}
      <span className="ml-1 text-xs text-slate-500">{value ? `${value}/5` : "Chọn số sao"}</span>
    </div>
  </div>
);

const ReadOnlyStars = ({ value }: { value: number }) => (
  <span className="inline-flex text-amber-500" aria-label={`${value} trên 5 sao`}>
    {Array.from({ length: 5 }, (_, index) =>
      index < value ? <StarFilled key={index} /> : <StarOutlined key={index} />,
    )}
  </span>
);

const MemberOverviewTab = () => {
  const [overview, setOverview] = useState<MembershipOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    membershipService
      .getOverview()
      .then(setOverview)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Không thể tải thông tin hội viên"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-slate-500">Đang tải quyền lợi hội viên...</div>;
  if (error) return <div role="alert" className="py-8 text-center text-rose-600">{error}</div>;
  if (!overview) return null;

  const { currentTier, nextTier } = overview;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card className="!rounded-2xl !border-emerald-200 !bg-gradient-to-br !from-emerald-50 !to-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Text className="!text-xs !font-semibold !text-slate-500">Hạng hội viên hiện tại</Text>
              <div className="mt-2 flex items-center gap-2">
                <CrownOutlined className="text-xl text-amber-500" />
                <Title level={3} className="!mb-0 !text-2xl !font-black !text-slate-900">
                  {currentTier.name}
                </Title>
              </div>
              <Text className="!mt-2 !block !text-xs !text-slate-500">
                Hội viên từ {formatDate(overview.member.joinedAt)}
              </Text>
            </div>
            <Tag color="gold" className="!rounded-full !px-3 !py-1 !font-bold">
              {currentTier.tableDiscountPercent}% ưu đãi bàn
            </Tag>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs">
              <span className="font-semibold text-slate-700">
                {overview.points.toLocaleString("vi-VN")} điểm
              </span>
              {nextTier ? (
                <span className="text-slate-500">
                  Còn {overview.pointsToNextTier.toLocaleString("vi-VN")} điểm lên hạng {nextTier.name}
                </span>
              ) : (
                <span className="font-semibold text-amber-700">Bạn đang ở hạng cao nhất</span>
              )}
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-emerald-100"
              role="progressbar"
              aria-valuenow={overview.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến trình nâng hạng"
            >
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${overview.progressPercent}%` }}
              />
            </div>
            {nextTier && (
              <div className="mt-2 text-right text-[11px] text-slate-500">
                Mốc tiếp theo: {nextTier.minPoints.toLocaleString("vi-VN")} điểm
              </div>
            )}
          </div>
        </Card>

        <Card className="!rounded-2xl !border-slate-200">
          <div className="flex items-center gap-2 text-emerald-700">
            <StarOutlined />
            <Text className="!font-bold !text-slate-800">Điểm tích lũy</Text>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {overview.points.toLocaleString("vi-VN")}
            <span className="ml-2 text-sm font-semibold text-slate-500">điểm</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <WalletOutlined className="text-emerald-600" />
            Tích 1 điểm cho mỗi {overview.earnPointsRate.toLocaleString("vi-VN")}đ thanh toán.
          </div>
        </Card>
      </div>

      <Card className="!rounded-2xl !border-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <GiftOutlined className="text-emerald-600" />
          <Title level={4} className="!mb-0 !text-base !font-bold !text-slate-900">
            Hạng thẻ & quyền lợi
          </Title>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {overview.tiers.map((tier) => {
            const isCurrentTier = tier.key === currentTier.key;
            return (
              <div
                key={tier.key}
                className={`rounded-xl border p-4 ${
                  isCurrentTier
                    ? "border-emerald-400 bg-emerald-50/70"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-slate-900">Hạng {tier.name}</strong>
                  {isCurrentTier && (
                    <Tag color="green" className="!m-0 !rounded-full !text-[10px]">
                      Hiện tại
                    </Tag>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Từ {tier.minPoints.toLocaleString("vi-VN")} điểm
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between gap-3">
                    <span>Giảm tiền bàn</span>
                    <strong>{tier.tableDiscountPercent}%</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Giảm dịch vụ F&B</span>
                    <strong>{tier.fnbDiscountPercent}%</strong>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
                  {tier.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-2 text-[11px] leading-relaxed text-slate-600">
                      <CheckCircleOutlined className="mt-0.5 shrink-0 text-emerald-600" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const PlayHistoryTab = () => {
  const [items, setItems] = useState<PlayHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [tableRating, setTableRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    let active = true;
    membershipService
      .getPlayHistory(page)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải lịch sử chơi");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, refreshVersion]);

  const handleSubmitReview = async (item: PlayHistoryItem) => {
    if (!tableRating || !serviceRating) {
      message.warning("Vui lòng đánh giá chất lượng bàn và phục vụ từ 1 đến 5 sao.");
      return;
    }

    setSavingReview(true);
    try {
      await membershipService.submitPlayReview({
        sessionId: item.sessionId,
        tableRating,
        serviceRating,
        comment: reviewComment,
      });
      setReviewSessionId(null);
      setTableRating(0);
      setServiceRating(0);
      setReviewComment("");
      setLoading(true);
      setRefreshVersion((current) => current + 1);
      message.success("Cảm ơn bạn đã gửi đánh giá!");
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "Không thể gửi đánh giá");
    } finally {
      setSavingReview(false);
    }
  };

  const openReviewForm = (sessionId: string) => {
    setReviewSessionId(sessionId);
    setTableRating(0);
    setServiceRating(0);
    setReviewComment("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Title level={4} className="!mb-1 !text-base !font-bold !text-slate-900">
            Các buổi chơi đã thanh toán
          </Title>
          <Text className="!text-xs !text-slate-500">{total} hóa đơn</Text>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            setRefreshVersion((current) => current + 1);
          }}
          loading={loading}
          className="!rounded-xl"
        >
          Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Đang tải lịch sử chơi...</div>
      ) : error ? (
        <div role="alert" className="py-8 text-center text-rose-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
          <TableOutlined className="text-3xl text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Chưa có buổi chơi nào được ghi nhận.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="!rounded-2xl !border-slate-200">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color="green" className="!m-0 !rounded-full">Đã thanh toán</Tag>
                      <span className="font-mono text-[11px] text-slate-400">{item.invoiceCode}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <TableOutlined className="text-emerald-600" />
                        {item.tableCode || item.tableName || "Bàn chơi"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarOutlined className="text-emerald-600" />
                        {formatDate(item.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClockCircleOutlined className="text-emerald-600" />
                        {item.durationFormatted || `${item.durationMinutes} phút`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.sessionStart} – {item.sessionEnd} · {paymentLabels[item.paymentMethod] || item.paymentMethod}
                      {item.pointsAwarded > 0 && (
                        <span className="ml-2 font-semibold text-emerald-700">
                          +{item.pointsAwarded} điểm
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <div className="sm:text-right">
                      <div className="text-[11px] text-slate-500">Đã thanh toán</div>
                      <strong className="text-base font-black text-emerald-700">
                        {Number(item.finalAmount || 0).toLocaleString("vi-VN")}đ
                      </strong>
                    </div>
                    {item.review ? (
                      <Tag color="blue" className="!m-0 !rounded-full">
                        Đã đánh giá
                      </Tag>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewForm(item.sessionId)}
                        className="!rounded-xl"
                      >
                        Gửi đánh giá
                      </Button>
                    )}
                  </div>
                </div>

                {item.review ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div className="flex flex-wrap gap-x-5 gap-y-1 font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        Chất lượng bàn: <ReadOnlyStars value={item.review.tableRating} />{" "}
                        {item.review.tableRating}/5
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        Phục vụ: <ReadOnlyStars value={item.review.serviceRating} />{" "}
                        {item.review.serviceRating}/5
                      </span>
                    </div>
                    {item.review.comment && (
                      <p className="mb-0 mt-2 text-slate-600">{item.review.comment}</p>
                    )}
                  </div>
                ) : reviewSessionId === item.sessionId ? (
                  <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <RatingStars
                        label="Chất lượng bàn chơi"
                        value={tableRating}
                        onChange={setTableRating}
                      />
                      <RatingStars
                        label="Thái độ phục vụ"
                        value={serviceRating}
                        onChange={setServiceRating}
                      />
                    </div>
                    <Input.TextArea
                      rows={3}
                      maxLength={1000}
                      showCount
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder="Chia sẻ cảm nhận của bạn (không bắt buộc)"
                      className="!rounded-xl"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewSessionId(null)}
                        disabled={savingReview}
                        className="!rounded-xl"
                      >
                        Hủy
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingReview}
                        onClick={() => void handleSubmitReview(item)}
                        className="!rounded-xl"
                      >
                        Gửi đánh giá
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end pt-2">
          <Pagination
            current={page}
            pageSize={10}
            total={total}
            showSizeChanger={false}
            onChange={(nextPage) => {
              setLoading(true);
              setPage(nextPage);
            }}
          />
        </div>
      )}
    </div>
  );
};

export { MemberOverviewTab, PlayHistoryTab };
