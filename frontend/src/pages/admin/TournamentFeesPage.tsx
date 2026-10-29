import { useCallback, useEffect, useState } from "react";
import { CheckOutlined, ReloadOutlined, TrophyOutlined } from "@ant-design/icons";
import { Button, Card, Tag, Typography, message } from "../../shared/ui";
import { tournamentService, type PendingTournamentFee } from "../../services/tournament.service";

const { Title, Text } = Typography;

const TournamentFeesPage = () => {
  const [items, setItems] = useState<PendingTournamentFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await tournamentService.getPendingFees());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải lệ phí đang chờ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const confirmPayment = async (item: PendingTournamentFee) => {
    const key = `${item.tournamentId}:${item.player.user._id}`;
    setConfirming(key);
    try {
      await tournamentService.confirmPlayerFee(item.tournamentId, item.player.user._id);
      setItems((current) =>
        current.filter((row) => `${row.tournamentId}:${row.player.user._id}` !== key),
      );
      message.success("Đã xác nhận lệ phí và gửi thông báo cho cơ thủ");
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "Không thể xác nhận lệ phí");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Title level={1} className="!mb-1 !text-2xl !font-bold">
            Lệ phí giải đấu tại quầy
          </Title>
          <Text className="!text-sm !text-slate-500">
            Xác nhận sau khi đã nhận tiền trực tiếp từ cơ thủ.
          </Text>
        </div>
        <Button
          variant="outline"
          leftIcon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void load()}
        >
          Tải lại
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Đang tải danh sách…</div>
      ) : error ? (
        <Card className="!rounded-xl">
          <div className="text-center text-sm text-rose-600">{error}</div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="!rounded-xl !border-slate-200 !py-8 !text-center">
          <TrophyOutlined className="text-3xl text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">Không có lệ phí giải đấu đang chờ xác nhận.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const key = `${item.tournamentId}:${item.player.user._id}`;
            return (
              <Card key={key} className="!rounded-xl !border-slate-200">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text strong className="!text-base">
                        {item.player.user.name}
                      </Text>
                      <Tag color="gold">Chờ thanh toán</Tag>
                    </div>
                    <Text className="!block !text-xs !text-slate-600">{item.tournamentName}</Text>
                    <Text className="!block !text-xs !text-slate-500">
                      {item.player.user.email}
                      {item.player.user.phone ? ` · ${item.player.user.phone}` : ""}
                    </Text>
                    <Text className="!block !text-xs !text-slate-500">
                      Thi đấu: {new Date(item.startDate).toLocaleDateString("vi-VN")}
                    </Text>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                    <span className="font-mono text-lg font-bold text-emerald-700">
                      {item.amount.toLocaleString("vi-VN")}đ
                    </span>
                    <Button
                      variant="primary"
                      leftIcon={<CheckOutlined />}
                      disabled={Boolean(confirming)}
                      loading={confirming === key}
                      onClick={() => void confirmPayment(item)}
                      className="!bg-emerald-600 !border-emerald-600"
                    >
                      Đã nhận tiền
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TournamentFeesPage;
