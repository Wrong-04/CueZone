import React, { useState } from "react";
import {
  WalletOutlined,
  QrcodeOutlined,
  HistoryOutlined,
  GiftOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Typography,
  Tabs,
  Modal,
  message,
  Space,
} from "../../shared/ui";

const { Text, Paragraph } = Typography;

interface TransactionItem {
  id: string;
  type: "topup" | "payment" | "refund";
  title: string;
  amount: number;
  time: string;
  balanceAfter: number;
  status: "success" | "pending";
}

interface VoucherReward {
  id: string;
  title: string;
  pointsRequired: number;
  desc: string;
  valueFormatted: string;
  tag: string;
}

const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: "tx-1",
    type: "topup",
    title: "Nạp tiền ví qua VietQR Techcombank",
    amount: 500000,
    time: "02/10/2026 08:45",
    balanceAfter: 750000,
    status: "success",
  },
  {
    id: "tx-2",
    type: "payment",
    title: "Thanh toán phiên chơi Bàn 03 (INV-0982)",
    amount: -192000,
    time: "01/10/2026 21:05",
    balanceAfter: 250000,
    status: "success",
  },
  {
    id: "tx-3",
    type: "payment",
    title: "Đóng lệ phí giải Bank Pool Championship Q2",
    amount: -200000,
    time: "28/09/2026 10:30",
    balanceAfter: 442000,
    status: "success",
  },
  {
    id: "tx-4",
    type: "topup",
    title: "Nạp tiền ví tại quầy thu ngân CLB",
    amount: 300000,
    time: "25/09/2026 19:15",
    balanceAfter: 642000,
    status: "success",
  },
];

const VOUCHER_REWARDS: VoucherReward[] = [
  {
    id: "rw-1",
    title: "Voucher Giờ Chơi 50.000 VNĐ",
    pointsRequired: 500,
    desc: "Áp dụng trừ trực tiếp vào hóa đơn tiền giờ chơi cho tất cả các loại bàn.",
    valueFormatted: "-50.000đ",
    tag: "Tiền Giờ",
  },
  {
    id: "rw-2",
    title: "Miễn Phí 01 Cà Phê Muối Signature",
    pointsRequired: 300,
    desc: "Thưởng thức ly cà phê muối đặc trưng của quầy bar CueZone khi vào bàn.",
    valueFormatted: "Miễn Phí 1 Ly",
    tag: "Đồ Uống",
  },
  {
    id: "rw-3",
    title: "Voucher Giờ Chơi 100.000 VNĐ",
    pointsRequired: 900,
    desc: "Ưu đãi cho các trận cơ kéo dài hoặc buổi tập luyện cuối tuần.",
    valueFormatted: "-100.000đ",
    tag: "Tiền Giờ",
  },
  {
    id: "rw-4",
    title: "02 Giờ Chơi Bàn VIP Bank Pool Miễn Phí",
    pointsRequired: 1400,
    desc: "Trải nghiệm không gian VIP Lounge riêng tư với bàn thi đấu tiêu chuẩn WPA.",
    valueFormatted: "2 Giờ VIP",
    tag: "Bàn VIP",
  },
];

export const CustomerWallet: React.FC = () => {
  const [balance, setBalance] = useState<number>(750000);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(2450);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<number>(200000);
  const [isProcessingTopup, setIsProcessingTopup] = useState<boolean>(false);
  const [redeemingVoucher, setRedeemingVoucher] = useState<VoucherReward | null>(null);

  const handleConfirmTopup = () => {
    setIsProcessingTopup(true);
    setTimeout(() => {
      const nextBalance = balance + topupAmount;
      const newTx: TransactionItem = {
        id: "tx-" + Date.now(),
        type: "topup",
        title: `Nạp tiền ví qua VietQR (+${topupAmount.toLocaleString("vi-VN")}đ)`,
        amount: topupAmount,
        time: "Vừa xong",
        balanceAfter: nextBalance,
        status: "success",
      };
      setBalance(nextBalance);
      setTransactions([newTx, ...transactions]);
      setIsProcessingTopup(false);
      setShowTopupModal(false);
      message.success(`Nạp thành công ${topupAmount.toLocaleString("vi-VN")}đ vào ví!`);
    }, 1000);
  };

  const handleRedeemVoucher = (voucher: VoucherReward) => {
    if (loyaltyPoints < voucher.pointsRequired) {
      message.error("Điểm tích lũy của bạn không đủ để đổi voucher này!");
      return;
    }

    setLoyaltyPoints((prev) => prev - voucher.pointsRequired);
    setRedeemingVoucher(null);
    message.success(`Đổi thành công voucher: ${voucher.title}! Mã voucher đã lưu vào ví của bạn.`);
  };

  return (
    <div className="space-y-8">
      {/* Thẻ Ví Điện Tử & Điểm Thưởng Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Cột 1: Thẻ Ví Trả Trước (Prepaid Wallet) */}
        <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-7 sm:p-9 border border-emerald-900/60 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <Space align="center" size={8}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <WalletOutlined className="text-xl" />
                </div>
                <div>
                  <Text strong className="!text-sm !text-white block uppercase tracking-wider">
                    Ví Trả Trước CueZone Pay
                  </Text>
                  <Text className="!text-[11px] !text-emerald-400/90 font-mono">
                    TÀI KHOẢN HỘI VIÊN CHÍNH THỨC
                  </Text>
                </div>
              </Space>

              <Tag color="green" className="!rounded-md !px-2.5 !py-0.5 !text-xs !font-bold">
                HOẠT ĐỘNG
              </Tag>
            </div>

            <div className="py-2">
              <Text className="!text-xs !text-slate-400 block mb-1">
                Số Dư Khả Dụng:
              </Text>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {balance.toLocaleString("vi-VN")}
                </span>
                <span className="text-emerald-400 text-lg font-bold">VNĐ</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between gap-3 relative z-10">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircleOutlined className="text-emerald-400" />
              Tự động thanh toán tiền bàn & F&B
            </span>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<QrcodeOutlined />}
              onClick={() => setShowTopupModal(true)}
              className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white !rounded-xl !h-9 !px-4 shadow-md"
            >
              Nạp Tiền Ví
            </Button>
          </div>
        </div>

        {/* Cột 2: Thẻ Điểm Tích Lũy (Loyalty Points) */}
        <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200 p-7 sm:p-9 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Space align="center" size={8}>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <CrownOutlined className="text-xl" />
                </div>
                <div>
                  <Text strong className="!text-sm !text-slate-900 block uppercase tracking-wider">
                    Điểm Thưởng Loyalty
                  </Text>
                  <Text className="!text-[11px] !text-amber-700 font-semibold">
                    HẠNG HỘI VIÊN: DIAMOND VIP
                  </Text>
                </div>
              </Space>

              <Tag color="gold" className="!rounded-md !px-2.5 !py-0.5 !text-xs !font-bold">
                HOÀN 10%
              </Tag>
            </div>

            <div className="py-2">
              <Text className="!text-xs !text-slate-400 block mb-1">
                Điểm Tích Lũy Hiện Tại:
              </Text>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                  {loyaltyPoints.toLocaleString("vi-VN")}
                </span>
                <span className="text-amber-600 text-base font-bold">điểm</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tích 1 điểm cho mỗi 1.000đ tiền giờ</span>
            <span className="font-semibold text-emerald-600">Đổi quà bên dưới ↓</span>
          </div>
        </div>
      </div>

      {/* Tabs Chuyển Đổi: Kho Đổi Thưởng vs Lịch Sử Giao Dịch */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <Tabs
          defaultActiveKey="rewards"
          className="[&_.ant-tabs-nav]:!mb-6 [&_.ant-tabs-tab]:!text-sm [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-600 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
          items={[
            {
              key: "rewards",
              label: (
                <Space size={6} align="center">
                  <GiftOutlined />
                  <span>Kho Đổi Thưởng Voucher ({VOUCHER_REWARDS.length})</span>
                </Space>
              ),
              children: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {VOUCHER_REWARDS.map((voucher) => (
                    <Card
                      key={voucher.id}
                      className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-300 hover:!shadow-md transition-all p-5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Tag color="cyan" className="!text-[10px] !font-bold !px-2 !py-0.5 !rounded-md uppercase">
                              {voucher.tag}
                            </Tag>
                            <Text strong className="!text-sm !text-slate-900 block mt-1">
                              {voucher.title}
                            </Text>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">
                            {voucher.valueFormatted}
                          </span>
                        </div>
                        <Paragraph className="!text-xs !text-slate-500 leading-relaxed !mb-0">
                          {voucher.desc}
                        </Paragraph>
                      </div>

                      <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                          <CrownOutlined /> {voucher.pointsRequired} điểm
                        </span>

                        <Button
                          variant="primary"
                          size="sm"
                          disabled={loyaltyPoints < voucher.pointsRequired}
                          onClick={() => setRedeemingVoucher(voucher)}
                          className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white !rounded-xl !h-8 !px-3.5 disabled:!opacity-50"
                        >
                          Đổi Ngay
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: "history",
              label: (
                <Space size={6} align="center">
                  <HistoryOutlined />
                  <span>Lịch Sử Giao Dịch Ví ({transactions.length})</span>
                </Space>
              ),
              children: (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs gap-3 hover:bg-slate-100/70 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            tx.type === "topup"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {tx.type === "topup" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        </div>
                        <div>
                          <Text strong className="!text-xs !text-slate-900 block">
                            {tx.title}
                          </Text>
                          <Text className="!text-[11px] !text-slate-400">
                            {tx.time} • Số dư sau GD: {tx.balanceAfter.toLocaleString("vi-VN")}đ
                          </Text>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-sm block ${
                            tx.type === "topup" ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {tx.type === "topup" ? "+" : ""}
                          {tx.amount.toLocaleString("vi-VN")}đ
                        </span>
                        <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !rounded">
                          Thành Công
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* MODAL NẠP TIỀN VÍ QUA VIETQR */}
      <Modal
        open={showTopupModal}
        onCancel={() => setShowTopupModal(false)}
        footer={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => setShowTopupModal(false)}
            className="!text-xs !rounded-xl"
          >
            Đóng
          </Button>,
          <Button
            key="confirm"
            variant="primary"
            loading={isProcessingTopup}
            onClick={handleConfirmTopup}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Tôi Đã Chuyển Khoản Thành Công
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <QrcodeOutlined className="text-emerald-600 text-lg" />
            <span className="text-slate-900 font-bold">Nạp Tiền Ví Trả Trước CueZone Pay</span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn số tiền muốn nạp:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopupAmount(amt)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition text-center ${
                    topupAmount === amt
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {amt.toLocaleString("vi-VN")}đ
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Chuyển Khoản Demo */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <div className="w-40 h-40 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-xs">
              {/* Giả lập VietQR code */}
              <div className="w-full h-full bg-slate-900 text-white flex flex-col items-center justify-center rounded-lg p-2 text-center">
                <QrcodeOutlined className="text-5xl text-emerald-400 mb-1" />
                <span className="text-[10px] font-mono text-emerald-300">VietQR Nap Vi</span>
                <span className="text-[9px] text-slate-400">{topupAmount.toLocaleString("vi-VN")} VNĐ</span>
              </div>
            </div>

            <div className="w-full space-y-1 text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span>Ngân hàng:</span>
                <strong>Techcombank (Hội sở)</strong>
              </div>
              <div className="flex justify-between">
                <span>Số tài khoản:</span>
                <strong className="font-mono text-emerald-700">1900 6868 9999</strong>
              </div>
              <div className="flex justify-between">
                <span>Chủ tài khoản:</span>
                <strong>CLB BIDA CUEZONE</strong>
              </div>
              <div className="flex justify-between">
                <span>Nội dung CK:</span>
                <strong className="font-mono text-amber-600">NAPVI CZ8829</strong>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL XÁC NHẬN ĐỔI VOUCHER */}
      <Modal
        open={!!redeemingVoucher}
        onCancel={() => setRedeemingVoucher(null)}
        footer={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => setRedeemingVoucher(null)}
            className="!text-xs !rounded-xl"
          >
            Hủy Bỏ
          </Button>,
          <Button
            key="confirm"
            variant="primary"
            onClick={() => redeemingVoucher && handleRedeemVoucher(redeemingVoucher)}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Xác Nhận Đổi
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <GiftOutlined className="text-emerald-600" />
            <span className="text-slate-900 font-bold">Xác Nhận Đổi Voucher</span>
          </Space>
        }
      >
        {redeemingVoucher && (
          <div className="space-y-3 py-2 text-xs text-slate-700">
            <p>
              Bạn muốn sử dụng <strong>{redeemingVoucher.pointsRequired} điểm</strong> để đổi voucher:
            </p>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="font-bold text-sm text-emerald-900">{redeemingVoucher.title}</div>
              <div className="text-slate-600">{redeemingVoucher.desc}</div>
              <div className="text-emerald-700 font-semibold pt-1">Giá trị: {redeemingVoucher.valueFormatted}</div>
            </div>
            <p className="text-slate-500">
              Điểm tích lũy còn lại sau khi đổi: <strong>{(loyaltyPoints - redeemingVoucher.pointsRequired).toLocaleString("vi-VN")} điểm</strong>.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerWallet;
