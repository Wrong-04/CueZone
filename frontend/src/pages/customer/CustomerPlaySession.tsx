import { useCallback, useEffect, useState } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
  ShoppingOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  customerOrderService,
  type ActiveOrderTable,
  type CustomerCheckoutPreview,
} from "../../services/customer-order.service";
import { productService, type ProductMenu } from "../../services/product.service";
import { CustomerFnbMenuModal } from "../../components/customer/CustomerFnbMenuModal";

const { Title, Text } = Typography;

type PaymentMethod = "cash" | "transfer";

interface BankTransferSettings {
  bankCode: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}

function getBankTransferSettings(): BankTransferSettings | null {
  try {
    const saved = window.localStorage.getItem("cuezone_admin_settings");
    if (!saved) return null;

    const value: unknown = JSON.parse(saved);
    if (!value || typeof value !== "object") return null;
    const settings = value as Record<string, unknown>;
    const bankCode =
      typeof settings.bankCode === "string" && settings.bankCode.trim()
        ? settings.bankCode.trim()
        : "MB";
    const bankName = typeof settings.bankName === "string" ? settings.bankName.trim() : "";
    const bankAccountNo =
      typeof settings.bankAccountNo === "string" ? settings.bankAccountNo.trim() : "";
    const bankAccountName =
      typeof settings.bankAccountName === "string" ? settings.bankAccountName.trim() : "";

    if (
      !/^[a-zA-Z0-9-]+$/.test(bankCode) ||
      !/^\d+$/.test(bankAccountNo) ||
      !bankName ||
      !bankAccountName
    ) {
      return null;
    }

    return { bankCode, bankName, bankAccountNo, bankAccountName };
  } catch (error) {
    console.error("Không thể đọc cấu hình tài khoản nhận chuyển khoản:", error);
    return null;
  }
}

export default function CustomerPlaySession() {
  const { user } = useAuth();
  const [tables, setTables] = useState<ActiveOrderTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [menu, setMenu] = useState<ProductMenu[]>([]);
  const [preview, setPreview] = useState<CustomerCheckoutPreview | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [bankSettings] = useState(getBankTransferSettings);
  const [now, setNow] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showFnbMenuModal, setShowFnbMenuModal] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [orderingFnb, setOrderingFnb] = useState(false);
  const selectedTable = tables.find((table) => table.tableId === selectedTableId);

  const refresh = useCallback(async () => {
    try {
      const activeTables = await customerOrderService.getActiveTables();
      const syncedAt = Date.now();
      setTables(activeTables);
      setNow(syncedAt);
      setRefreshedAt(syncedAt);
      setSelectedTableId((current) =>
        activeTables.some((table) => table.tableId === current)
          ? current
          : (activeTables[0]?.tableId ?? ""),
      );
      setPreview(null);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể cập nhật phiên chơi");
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    productService
      .getFnbMenu()
      .then((items) => {
        if (active) setMenu(items);
      })
      .catch((error: unknown) =>
        message.error(error instanceof Error ? error.message : "Không thể tải thực đơn"),
      )
      .finally(() => {
        if (active) setLoadingMenu(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const baseQuote = selectedTable;
  const quote = preview ?? baseQuote;
  const elapsedSeconds = selectedTable
    ? Math.max(
        0,
        selectedTable.elapsedSeconds +
          (!selectedTable.isPaused ? Math.floor((now - refreshedAt) / 1000) : 0),
      )
    : 0;
  const sessionTime = [
    Math.floor(elapsedSeconds / 3600),
    Math.floor((elapsedSeconds % 3600) / 60),
    elapsedSeconds % 60,
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  const formatMoney = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;

  const submitCheckout = async () => {
    if (!selectedTable) return;
    setPaying(true);
    try {
      const result = await customerOrderService.requestCheckout(selectedTable.tableId, {
        sessionId: selectedTable.sessionId,
        paymentMethod,
      });
      if (result.status === "paid") {
        message.success("Thanh toán thành công. Cảm ơn bạn đã sử dụng dịch vụ!");
        setPreview(null);
      } else {
        message.success("Đã gửi yêu cầu. Bàn tạm dừng tính giờ trong khi chờ nhân viên xác nhận.");
      }
      await refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể tạo yêu cầu thanh toán");
    } finally {
      setPaying(false);
    }
  };

  const updateOrderQuantity = (productId: string, delta: number) => {
    setOrderQuantities((current) => {
      const quantity = Math.max(0, (current[productId] || 0) + delta);
      if (quantity === 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: quantity };
    });
  };

  const submitFnbOrder = async () => {
    if (!selectedTable) {
      message.warning("Không tìm thấy phiên bàn đang hoạt động để gửi order.");
      return;
    }
    const items = Object.entries(orderQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
    if (!items.length) return;

    setOrderingFnb(true);
    try {
      await customerOrderService.create({
        tableId: selectedTable.tableId,
        sessionId: selectedTable.sessionId,
        items,
      });
      setOrderQuantities({});
      setShowFnbMenuModal(false);
      message.success("Order đã được gửi tới quầy.");
      await refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể gửi order");
    } finally {
      setOrderingFnb(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text className="text-sm font-semibold uppercase tracking-wide text-brand">Dịch vụ tại bàn</Text>
          <Title level={2} className="!mb-1 !mt-1">Phiên chơi của tôi</Title>
          <Text type="secondary">Theo dõi thời gian, gọi đồ uống ẩm thực và thanh toán ngay trên điện thoại.</Text>
        </div>
        <Button
          variant="outline"
          icon={<SyncOutlined />}
          onClick={() => void refresh()}
        >
          Cập nhật
        </Button>
      </div>

      {!user || user.role !== "customer" ? (
        <Card className="max-w-xl mx-auto rounded-3xl p-8 text-center">
          <Text>Vui lòng đăng nhập tài khoản hội viên để xem phiên chơi.</Text>
        </Card>
      ) : !tables.length ? (
        <Card className="py-12 px-6 text-center max-w-xl mx-auto rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
            <ClockCircleOutlined />
          </div>
          <div>
            <Title level={4} className="!mb-1.5 !text-lg !font-bold !text-slate-900">
              Bạn chưa có phiên chơi đang hoạt động
            </Title>
            <Text className="!text-xs !text-slate-500 block max-w-md mx-auto leading-relaxed">
              Khi đến CLB, bạn chỉ cần đọc số điện thoại{" "}
              <strong className="text-emerald-700 font-mono font-bold">
                {user.phone || "đăng ký hội viên"}
              </strong>{" "}
              để nhân viên mở bàn. Hệ thống sẽ tự động đồng bộ thời gian chơi, giá tiền và cho phép gọi món tại đây!
            </Text>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<SyncOutlined />}
              onClick={() => void refresh()}
              className="!rounded-xl !text-xs font-semibold"
            >
              Kiểm Tra Lại Bàn
            </Button>
            <Button
              variant="primary"
              size="sm"
              to="/customer/booking"
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white !rounded-xl !text-xs font-bold"
            >
              Đặt Bàn Trước
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {tables.length > 1 && (
            <Select
              value={selectedTableId}
              onChange={setSelectedTableId}
              className="w-full max-w-sm"
              options={tables.map((table) => ({
                value: table.tableId,
                label: `${table.tableCode} · ${table.tableName}`,
              }))}
            />
          )}
          {selectedTable && (
            <>
              {selectedTable.checkoutState === "pending_payment" ? (
                <Card className="border-amber-300 bg-amber-50">
                  <Space>
                    <ClockCircleOutlined className="text-xl text-amber-700" />
                    <div>
                      <Text strong>Đang chờ nhân viên xác nhận thanh toán</Text>
                      <div className="text-sm text-slate-600">
                        Bàn đã tạm dừng tính giờ. Bạn có thể tiếp tục chơi nếu nhân viên từ chối yêu cầu.
                      </div>
                    </div>
                  </Space>
                </Card>
              ) : null}
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Text type="secondary">BÀN HIỆN TẠI</Text>
                        <Title level={3} className="!mb-1 !mt-1">{selectedTable.tableCode} · {selectedTable.tableName}</Title>
                        <Tag color={selectedTable.isPaused ? "orange" : "green"}>
                          {selectedTable.isPaused ? "Đang tạm dừng" : "Đang chơi"}
                        </Tag>
                      </div>
                      <div className="text-right">
                        <Text type="secondary">Thời gian chơi</Text>
                        <div className="text-3xl font-bold tabular-nums text-brand">{sessionTime}</div>
                        <Text type="secondary">Bắt đầu {selectedTable.sessionStart}</Text>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Metric label="Tiền bàn" value={formatMoney(selectedTable.playingCost)} />
                      <Metric label="F&B đã xác nhận" value={formatMoney(selectedTable.fnbTotal)} />
                      <Metric label="Hạng hội viên" value={selectedTable.tier.name} />
                    </div>
                    <Text className="mt-3 block text-xs text-slate-500">
                      Chi phí được đồng bộ với máy chủ mỗi 8 giây.
                    </Text>
                  </Card>

                  {/* Card F&B và Phụ kiện - Điều hướng mượt sang menu đầy đủ */}
                  <Card className="!border-emerald-200/90 !bg-gradient-to-br !from-emerald-50/50 !via-white !to-slate-50 !rounded-2xl shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Tag color="green" className="!font-bold !text-xs !rounded-md uppercase">
                            <CoffeeOutlined className="mr-1" /> Dịch vụ F&B & Phụ kiện
                          </Tag>
                          {!loadingMenu && (
                            <span className="text-xs text-emerald-800 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                              {menu.length} món sẵn sàng phục vụ
                            </span>
                          )}
                        </div>
                        <Title level={4} className="!text-base !font-bold !text-slate-900 !mb-0 !mt-1">
                          Gọi Đồ Uống & Ẩm Thực Tận Bàn
                        </Title>
                        <Text type="secondary" className="!text-xs block text-slate-500 max-w-lg">
                          Menu đa dạng đồ uống mát lạnh, cà phê, thức ăn nhẹ và phụ kiện bida. Gọi món trực tiếp không cần rời bàn.
                        </Text>
                      </div>
                      <Button
                        variant="primary"
                        leftIcon={<ShoppingOutlined />}
                        onClick={() => setShowFnbMenuModal(true)}
                        disabled={loadingMenu || menu.length === 0}
                        className="!h-11 !rounded-xl !bg-emerald-600 !px-6 !font-bold !text-white !border-emerald-600 shrink-0"
                      >
                        {loadingMenu ? "Đang tải thực đơn..." : "Mở menu gọi món"}
                      </Button>
                    </div>
                  </Card>

                  <Card title="Món đã được xác nhận vào phiên">
                    {selectedTable.orders.length ? (
                      <div className="space-y-2">
                        {selectedTable.orders.map((order) => (
                          <div key={order.id} className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                            <div>
                              <Text strong>{order.name} × {order.quantity}</Text>
                              <div><Text type="secondary" className="text-xs">{order.orderTime}</Text></div>
                            </div>
                            <Text>{formatMoney(order.price * order.quantity)}</Text>
                          </div>
                        ))}
                      </div>
                    ) : <Text type="secondary">Chưa có món F&B nào được xác nhận.</Text>}
                  </Card>
                </div>

                <Card
                  title={<span><CreditCardOutlined className="mr-2" />Tạm tính hóa đơn</span>}
                  className="h-fit lg:sticky lg:top-5"
                >
                  {quote && (
                    <div className="space-y-3.5">
                      <SummaryRow label="Tiền bàn" value={formatMoney(quote.playingCost)} />
                      <SummaryRow label="F&B" value={formatMoney(quote.fnbTotal)} />
                      <SummaryRow label="Tạm tính" value={formatMoney(quote.subtotal)} />
                      <SummaryRow
                        label={`Ưu đãi hạng ${quote.tier.name}`}
                        value={`−${formatMoney(quote.membershipDiscountAmount)}`}
                        positive
                      />
                      {quote.deposit > 0 && <SummaryRow label="Tiền cọc" value={`−${formatMoney(quote.deposit)}`} positive />}

                      <div className="border-t border-slate-200 pt-3">
                        <SummaryRow label="Cần thanh toán" value={formatMoney(quote.totalDue)} strong />
                      </div>

                      {/* Thông báo tự động áp dụng ưu đãi hội viên chuẩn Sabo */}
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs">
                        <CheckCircleOutlined className="text-emerald-600 shrink-0 text-sm mt-0.5" />
                        <span>
                          Tự động áp dụng đặc quyền <strong>Hạng {quote.tier.name}</strong>: Giảm{" "}
                          <strong>{quote.tier.tableDiscountPercent}%</strong> tiền bàn &{" "}
                          <strong>{quote.tier.fnbDiscountPercent}%</strong> F&B.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Phương thức thanh toán:
                        </label>
                        <Select<PaymentMethod>
                          value={paymentMethod}
                          onChange={setPaymentMethod}
                          className="w-full !h-10"
                          disabled={selectedTable.checkoutState !== "open"}
                          options={[
                            { value: "cash", label: "Tiền mặt — chờ nhân viên" },
                            { value: "transfer", label: "Chuyển khoản VietQR — chờ đối soát" },
                          ]}
                        />
                      </div>

                      {paymentMethod === "transfer" && (
                        <div className="space-y-2.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-3.5">
                          {quote.totalDue <= 0 ? (
                            <Text className="block text-sm text-emerald-800">
                              Bạn không cần thanh toán thêm cho hóa đơn này.
                            </Text>
                          ) : bankSettings ? (
                            <>
                              <div className="flex items-center gap-3.5">
                                <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-300 bg-white p-1 shadow-sm">
                                  <img
                                    src={`https://img.vietqr.io/image/${bankSettings.bankCode}-${bankSettings.bankAccountNo}-compact2.png?amount=${quote.totalDue}&addInfo=${encodeURIComponent(`CueZone ${selectedTable.tableCode}`)}&accountName=${encodeURIComponent(bankSettings.bankAccountName)}`}
                                    alt={`Mã QR chuyển khoản cho bàn ${selectedTable.tableCode}`}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1 text-xs">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Tag color="green" className="!m-0 !rounded-md !px-1.5 !py-0 !text-[10px] !font-bold">
                                      VIETQR 24/7
                                    </Tag>
                                    <span className="text-xs font-extrabold text-slate-900">
                                      {bankSettings.bankName}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600">
                                    STK: <strong className="font-mono font-bold text-slate-900">{bankSettings.bankAccountNo}</strong>
                                  </div>
                                  <div className="truncate text-[11px] text-slate-600">
                                    Chủ TK: <strong className="font-bold text-slate-900">{bankSettings.bankAccountName}</strong>
                                  </div>
                                  <div className="text-[11px] text-slate-600">
                                    Số tiền: <strong className="font-mono text-sm font-black text-emerald-700">{formatMoney(quote.totalDue)}</strong>
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-500">
                                    Nội dung: <strong>CueZone {selectedTable.tableCode}</strong>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-white/80 p-2 text-[11px] text-emerald-800">
                                <CheckCircleOutlined className="shrink-0 text-emerald-600" />
                                <span>
                                  Chuyển khoản xong, nhấn <strong>Gửi yêu cầu thanh toán</strong> để nhân viên đối soát và xác nhận hóa đơn.
                                </span>
                              </div>
                            </>
                          ) : (
                            <Text className="block text-sm text-amber-800">
                              Chưa có cấu hình ngân hàng để tạo QR trên thiết bị này. Vui lòng chọn tiền mặt
                              hoặc liên hệ nhân viên để được hướng dẫn chuyển khoản.
                            </Text>
                          )}
                        </div>
                      )}

                      <Button
                        block
                        size="lg"
                        loading={paying}
                        disabled={selectedTable.checkoutState !== "open"}
                        icon={paymentMethod === "transfer" ? <QrcodeOutlined /> : <CheckCircleOutlined />}
                        onClick={() => void submitCheckout()}
                        className="!h-11 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold"
                      >
                        {paymentMethod === "cash" ? "Yêu cầu thanh toán tiền mặt" : "Gửi yêu cầu thanh toán chuyển khoản"}
                      </Button>
                      <Text type="secondary" className="block text-xs text-center">
                        Hóa đơn chỉ hoàn tất sau khi nhân viên nhận tiền hoặc xác nhận chuyển khoản.
                      </Text>
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}
      <CustomerFnbMenuModal
        open={showFnbMenuModal}
        onClose={() => setShowFnbMenuModal(false)}
        items={menu}
        loading={loadingMenu}
        selectedQuantities={orderQuantities}
        onQuantityChange={updateOrderQuantity}
        onConfirm={() => void submitFnbOrder()}
        confirmLabel="Gửi order đến quầy"
        confirming={orderingFnb}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <Text type="secondary" className="block text-xs">{label}</Text>
      <Text strong className="text-lg">{value}</Text>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  positive = false,
  strong = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Text type={positive ? "success" : "secondary"} strong={strong}>{label}</Text>
      <Text type={positive ? "success" : undefined} strong={strong}>{value}</Text>
    </div>
  );
}
