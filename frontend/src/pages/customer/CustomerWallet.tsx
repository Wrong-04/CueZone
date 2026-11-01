import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ReloadOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Card, Modal, Space, Tag, Typography, message } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  walletService,
  type WalletInfo,
  type WalletTransaction,
  type VnpayTopupStatus,
} from "../../services/wallet.service";

const { Title, Text } = Typography;
const presetAmounts = [100000, 200000, 500000] as const;
const formatMoney = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;
const formatDate = (value: string) => new Date(value).toLocaleString("vi-VN");

export const CustomerWallet: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentReference = searchParams.get("vnp_TxnRef");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(200000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<VnpayTopupStatus | null>(null);
  const [gatewayError, setGatewayError] = useState("");
  const [checkingGatewayStatus, setCheckingGatewayStatus] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      setWallet(await walletService.getMine());
      window.dispatchEvent(new Event("cuezone:wallet-updated"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải thông tin ví");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadWallet(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadWallet]);

  const checkGatewayStatus = useCallback(async (): Promise<boolean> => {
    if (!paymentReference) return false;
    setCheckingGatewayStatus(true);
    setGatewayError("");
    try {
      const status = await walletService.getVnpayTopupStatus(paymentReference);
      setGatewayStatus(status);
      if (status.status !== "pending") await loadWallet();
      return status.status === "pending";
    } catch (error) {
      setGatewayError(
        error instanceof Error ? error.message : "Không thể kiểm tra kết quả thanh toán VNPay",
      );
      return false;
    } finally {
      setCheckingGatewayStatus(false);
    }
  }, [loadWallet, paymentReference]);

  useEffect(() => {
    if (!paymentReference) return;
    let active = true;
    let attempts = 0;
    const poll = async () => {
      if (!active || attempts >= 20) return;
      attempts += 1;
      let isPending = false;
      try {
        const status = await walletService.getVnpayTopupStatus(paymentReference);
        if (!active) return;
        setGatewayStatus(status);
        isPending = status.status === "pending";
        if (!isPending) await loadWallet();
      } catch (error) {
        if (active) {
          setGatewayError(
            error instanceof Error ? error.message : "Không thể kiểm tra kết quả thanh toán VNPay",
          );
        }
      }
      if (active && isPending) timer = window.setTimeout(poll, 3000);
    };
    let timer = window.setTimeout(poll, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadWallet, paymentReference]);

  const handleRequestTopup = async () => {
    if (!presetAmounts.includes(topupAmount as (typeof presetAmounts)[number])) {
      message.error("Vui lòng chọn mệnh giá 100.000đ, 200.000đ hoặc 500.000đ");
      return;
    }
    setIsSubmitting(true);
    try {
      const payment = await walletService.createVnpayTopup(
        topupAmount as (typeof presetAmounts)[number],
      );
      window.location.assign(payment.paymentUrl);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể tạo giao dịch VNPay");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTransaction = (transaction: WalletTransaction) => {
    const isTopup = transaction.type === "topup";
    const statusLabel =
      transaction.status === "pending"
        ? transaction.gateway === "vnpay"
          ? "Chờ thanh toán"
          : "Chờ đối soát"
        : transaction.status === "success"
          ? "Thành công"
          : "Chưa xác nhận";
    const statusColor =
      transaction.status === "pending"
        ? "gold"
        : transaction.status === "success"
          ? "green"
          : "red";
    return (
      <div
        key={transaction._id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isTopup ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
          >
            {isTopup ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          </div>
          <div className="min-w-0">
            <Text strong className="!block !truncate !text-sm !text-slate-900">
              {transaction.description}
            </Text>
            <Text className="!text-xs !text-slate-500">
              {formatDate(transaction.createdAt)} · Mã: {transaction.referenceCode}
            </Text>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div
            className={`font-mono text-sm font-bold ${isTopup ? "text-emerald-700" : "text-slate-800"}`}
          >
            {isTopup ? "+" : "−"}
            {formatMoney(transaction.amount)}
          </div>
          <Tag color={statusColor} className="!mt-1 !text-[10px]">
            {statusLabel}
          </Tag>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <Card className="!mx-auto !max-w-xl !rounded-2xl !border-slate-200 !p-6 !text-center">
        <WalletOutlined className="text-3xl text-emerald-600" />
        <Title level={3} className="!mt-3 !text-lg">
          Đăng nhập để sử dụng ví
        </Title>
        <Text className="!text-slate-500">
          Số dư và lịch sử giao dịch được gắn với tài khoản hội viên của bạn.
        </Text>
        <div className="mt-5">
          <Button variant="primary" onClick={() => navigate("/login")}>
            Đăng nhập
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Title level={1} className="!mb-1 !text-2xl !font-bold !text-slate-900">
            Ví CueZone
          </Title>
          <Text className="!text-sm !text-slate-500">
            Số dư và giao dịch được lưu theo tài khoản của bạn.
          </Text>
        </div>
        <Button
          variant="outline"
          leftIcon={<ReloadOutlined />}
          onClick={() => void loadWallet()}
          loading={loading}
        >
          Tải lại
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="!rounded-2xl !border-emerald-900 !bg-gradient-to-br !from-emerald-950 !to-slate-900 lg:!col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Space align="center" size={10}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <WalletOutlined className="text-xl" />
              </div>
              <div>
                <Text strong className="!block !text-sm !uppercase !tracking-wide !text-white">
                  Ví trả trước CueZone
                </Text>
                <Text className="!text-xs !text-emerald-300">Số dư tài khoản hội viên</Text>
              </div>
            </Space>
            <Tag color="green">ĐANG HOẠT ĐỘNG</Tag>
          </div>
          <div className="mt-7">
            <Text className="!text-xs !text-slate-300">Số dư khả dụng</Text>
            <div className="mt-1 font-mono text-4xl font-black text-white">
              {loading ? "—" : formatMoney(wallet?.balance || 0)}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <Text className="!text-xs !text-slate-300">
              Nạp tiền an toàn qua cổng thanh toán VNPay Sandbox.
            </Text>
            <Button
              variant="primary"
              onClick={() => setShowTopupModal(true)}
              className="!bg-emerald-600 !border-emerald-600"
            >
              Nạp qua VNPay
            </Button>
          </div>
        </Card>

        {paymentReference && (
          <Card className="!rounded-2xl !border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Text strong className="!block !text-sm !text-slate-900">
                  Kết quả thanh toán VNPay
                </Text>
                <Text className="!text-xs !text-slate-500">
                  Mã giao dịch: {paymentReference}
                </Text>
                {gatewayStatus && (
                  <Text className="!mt-1 !block !text-sm">
                    {gatewayStatus.status === "success"
                      ? `Đã nạp thành công ${formatMoney(gatewayStatus.amount)}`
                      : gatewayStatus.status === "failed"
                        ? "Giao dịch chưa thành công. Số dư ví không thay đổi."
                        : "Đang chờ VNPay xác nhận. Số dư sẽ cập nhật sau khi nhận IPN."}
                  </Text>
                )}
                {gatewayError && (
                  <Text className="!mt-1 !block !text-sm !text-rose-600">{gatewayError}</Text>
                )}
              </div>
              <Button
                variant="outline"
                leftIcon={<ReloadOutlined />}
                loading={checkingGatewayStatus}
                onClick={() => void checkGatewayStatus()}
              >
                Kiểm tra trạng thái
              </Button>
            </div>
          </Card>
        )}

        <Card className="!rounded-2xl !border-slate-200">
          <div className="flex items-center gap-3">
            <ClockCircleOutlined className="text-xl text-amber-600" />
            <Text strong className="!text-sm">
              Đang chờ xác nhận
            </Text>
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">
            {wallet?.transactions.filter(
              (item) => item.type === "topup" && item.status === "pending",
            ).length ?? 0}
          </div>
          <Text className="!text-xs !text-slate-500">
            giao dịch đang chờ thanh toán hoặc xác nhận
          </Text>
        </Card>
      </div>

      <Card
        className="!rounded-2xl !border-slate-200"
        title={
          <Space>
            <HistoryOutlined />
            <span>Lịch sử giao dịch</span>
          </Space>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-slate-500">Đang tải giao dịch…</div>
        ) : loadError ? (
          <div className="py-8 text-center">
            <p className="mb-3 text-sm text-rose-600">{loadError}</p>
            <Button variant="outline" onClick={() => void loadWallet()}>
              Thử lại
            </Button>
          </div>
        ) : wallet?.transactions.length ? (
          <div className="space-y-3">
            {[...wallet.transactions]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(renderTransaction)}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            Chưa có giao dịch nào trong ví.
          </div>
        )}
      </Card>

      <Modal
        open={showTopupModal}
        onCancel={() => setShowTopupModal(false)}
        title="Nạp tiền qua VNPay"
        footer={[
          <Button key="cancel" variant="outline" onClick={() => setShowTopupModal(false)}>
            Đóng
          </Button>,
          <Button
            key="submit"
            variant="primary"
            loading={isSubmitting}
            onClick={() => void handleRequestTopup()}
          >
            Thanh toán VNPay
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm leading-6 text-slate-600">
            Chọn mệnh giá để thanh toán qua VNPay. Khi VNPay xác nhận thành công, tiền được cộng tự
            động vào số dư khả dụng, không cần nhân viên duyệt.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTopupAmount(amount)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${topupAmount === amount ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-700"}`}
              >
                {formatMoney(amount)}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Giao dịch thanh toán sẽ hết hạn sau 15 phút nếu chưa hoàn tất.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerWallet;
