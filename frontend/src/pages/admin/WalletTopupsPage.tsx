import { useCallback, useEffect, useState } from "react";
import { CheckOutlined, CloseOutlined, ReloadOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Card, Tag, Typography, message } from "../../shared/ui";
import { walletService, type PendingTopup } from "../../services/wallet.service";

const { Title, Text } = Typography;

const WalletTopupsPage = () => {
  const [items, setItems] = useState<PendingTopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await walletService.getPendingTopups());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải yêu cầu nạp ví");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const review = async (item: PendingTopup, status: "success" | "failed") => {
    setReviewing(item.transaction._id);
    try {
      await walletService.reviewTopup(item.transaction._id, status);
      message.success(status === "success" ? "Đã xác nhận và cộng tiền vào ví" : "Đã từ chối yêu cầu nạp");
      setItems((current) => current.filter((row) => row.transaction._id !== item.transaction._id));
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "Không thể cập nhật yêu cầu");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Title level={1} className="!mb-1 !text-2xl !font-bold">Đối soát nạp ví</Title>
          <Text className="!text-sm !text-slate-500">Chỉ xác nhận sau khi đã kiểm tra giao dịch nhận tiền thực tế.</Text>
        </div>
        <Button variant="outline" leftIcon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Tải lại</Button>
      </div>

      {loading ? <div className="py-12 text-center text-slate-500">Đang tải yêu cầu…</div> : error ? (
        <Card className="!rounded-xl"><div className="text-center text-sm text-rose-600">{error}</div></Card>
      ) : items.length === 0 ? (
        <Card className="!rounded-xl !border-slate-200 !py-8 !text-center">
          <WalletOutlined className="text-3xl text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">Không có yêu cầu nạp ví đang chờ.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.transaction._id} className="!rounded-xl !border-slate-200">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text strong className="!text-base">{item.user.name}</Text>
                    <Tag color="gold">Chờ đối soát</Tag>
                  </div>
                  <Text className="!block !text-xs !text-slate-500">{item.user.email}{item.user.phone ? ` · ${item.user.phone}` : ""}</Text>
                  <Text className="!block !text-xs !text-slate-500">Mã: {item.transaction.referenceCode} · {new Date(item.transaction.createdAt).toLocaleString("vi-VN")}</Text>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                  <span className="font-mono text-lg font-bold text-emerald-700">{item.transaction.amount.toLocaleString("vi-VN")}đ</span>
                  <Button variant="outline" leftIcon={<CloseOutlined />} disabled={Boolean(reviewing)} loading={reviewing === item.transaction._id} onClick={() => void review(item, "failed")} className="!text-rose-600">Từ chối</Button>
                  <Button variant="primary" leftIcon={<CheckOutlined />} disabled={Boolean(reviewing)} loading={reviewing === item.transaction._id} onClick={() => void review(item, "success")} className="!bg-emerald-600 !border-emerald-600">Đã nhận tiền</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletTopupsPage;
