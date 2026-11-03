import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  CreditCardOutlined,
  MinusOutlined,
  PlusOutlined,
  SyncOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
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

const { Title, Text } = Typography;

type PaymentMethod = "cash" | "transfer" | "member_balance";

export default function CustomerPlaySession() {
  const { user } = useAuth();
  const [tables, setTables] = useState<ActiveOrderTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [menu, setMenu] = useState<ProductMenu[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
  const [preview, setPreview] = useState<CustomerCheckoutPreview | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("member_balance");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [paying, setPaying] = useState(false);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const selectedTable = tables.find((table) => table.tableId === selectedTableId);

  const refresh = useCallback(async () => {
    try {
      const activeTables = await customerOrderService.getActiveTables();
      const syncedAt = Date.now();
      setTables(activeTables);
      setNow(syncedAt);
      setRefreshedAt(syncedAt);
      const selected =
        activeTables.find((table) => table.tableId === selectedTableId) ?? activeTables[0];
      setSelectedTableId((current) =>
        activeTables.some((table) => table.tableId === current)
          ? current
          : (activeTables[0]?.tableId ?? ""),
      );
      if (!selected || !appliedVoucherCode || selected.checkoutState !== "open") {
        setPreview(null);
      } else {
        try {
          setPreview(
            await customerOrderService.previewCheckout(
              selected.tableId,
              selected.sessionId,
              appliedVoucherCode,
            ),
          );
        } catch (error) {
          setAppliedVoucherCode("");
          setPreview(null);
          message.error(error instanceof Error ? error.message : "Không thể cập nhật voucher");
        }
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể cập nhật phiên chơi");
    }
  }, [selectedTableId, appliedVoucherCode]);

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

  const selectedProducts = useMemo(
    () =>
      menu
        .filter((item) => (cart[item._id] ?? 0) > 0)
        .map((item) => ({ item, quantity: cart[item._id] })),
    [cart, menu],
  );
  const cartTotal = selectedProducts.reduce(
    (total, product) => total + product.item.salePrice * product.quantity,
    0,
  );
  const baseQuote = selectedTable;
  const quote = preview ?? baseQuote;
  const elapsedSeconds = selectedTable
    ? Math.max(
        0,
        selectedTable.elapsedSeconds +
          (!selectedTable.isPaused ? Math.floor((now - refreshedAt) / 1000) : 0),
      )
    : 0;
  const sessionTime = [Math.floor(elapsedSeconds / 3600), Math.floor((elapsedSeconds % 3600) / 60), elapsedSeconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  const formatMoney = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[productId] ?? 0) + delta);
      const next = { ...current };
      if (quantity === 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  };

  const sendOrder = async () => {
    if (!selectedTable || !selectedProducts.length) return;
    setOrdering(true);
    try {
      await customerOrderService.create({
        tableId: selectedTable.tableId,
        sessionId: selectedTable.sessionId,
        items: selectedProducts.map(({ item, quantity }) => ({
          productId: item._id,
          quantity,
        })),
        note,
      });
      setCart({});
      setNote("");
      message.success("Đã gửi món tới quầy. Món được tính vào hóa đơn sau khi nhân viên xác nhận.");
      await refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể gửi món");
      await refresh();
    } finally {
      setOrdering(false);
    }
  };

  const applyVoucher = async () => {
    if (!selectedTable || !voucherCode.trim()) {
      message.warning("Vui lòng nhập mã voucher");
      return;
    }
    setApplyingVoucher(true);
    try {
      const code = voucherCode.trim().toUpperCase();
      const result = await customerOrderService.previewCheckout(
        selectedTable.tableId,
        selectedTable.sessionId,
        code,
      );
      setAppliedVoucherCode(code);
      setPreview(result);
      message.success(`Đã áp dụng voucher ${code}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Voucher không hợp lệ");
    } finally {
      setApplyingVoucher(false);
    }
  };

  const submitCheckout = async () => {
    if (!selectedTable) return;
    setPaying(true);
    try {
      const result = await customerOrderService.requestCheckout(selectedTable.tableId, {
        sessionId: selectedTable.sessionId,
        paymentMethod,
        ...(appliedVoucherCode ? { voucherCode: appliedVoucherCode } : {}),
      });
      if (result.status === "paid") {
        message.success("Thanh toán ví thành công. Cảm ơn bạn đã sử dụng dịch vụ!");
        setAppliedVoucherCode("");
        setVoucherCode("");
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text className="text-sm font-semibold uppercase tracking-wide text-brand">Dịch vụ tại bàn</Text>
          <Title level={2} className="!mb-1 !mt-1">Phiên chơi của tôi</Title>
          <Text type="secondary">Theo dõi thời gian, gọi món và thanh toán ngay trên điện thoại.</Text>
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
        <Card><Text>Vui lòng đăng nhập tài khoản hội viên để xem phiên chơi.</Text></Card>
      ) : !tables.length ? (
        <Card className="py-8 text-center">
          <ClockCircleOutlined className="text-4xl text-slate-400" />
          <Title level={4}>Bạn chưa có phiên chơi đang hoạt động</Title>
          <Text type="secondary">Thông tin bàn sẽ xuất hiện tại đây sau khi nhân viên mở bàn cho bạn.</Text>
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

                  <Card title={<span><CoffeeOutlined className="mr-2" />Thực đơn F&B</span>}>
                    {loadingMenu ? (
                      <Text type="secondary">Đang tải thực đơn…</Text>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {menu.map((item) => (
                          <div key={item._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                            <div className="min-w-0">
                              <Text strong className="block truncate">{item.name}</Text>
                              <Text type="secondary">{formatMoney(item.salePrice)}</Text>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              icon={<PlusOutlined />}
                              disabled={item.isOutOfStock || selectedTable.checkoutState !== "open"}
                              onClick={() => updateQuantity(item._id, 1)}
                            >
                              {cart[item._id] ? ` ${cart[item._id]}` : ""}
                            </Button>
                          </div>
                        ))}
                        {!menu.length && <Text type="secondary">Hiện chưa có món được bán.</Text>}
                      </div>
                    )}
                    {selectedProducts.length > 0 && (
                      <div className="mt-5 border-t border-slate-200 pt-4">
                        {selectedProducts.map(({ item, quantity }) => (
                          <div key={item._id} className="flex items-center justify-between gap-3 py-1">
                            <Text>{item.name}</Text>
                            <Space>
                              <Button size="sm" variant="outline" icon={<MinusOutlined />} onClick={() => updateQuantity(item._id, -1)} />
                              <Text>{quantity}</Text>
                              <Button size="sm" variant="outline" icon={<PlusOutlined />} onClick={() => updateQuantity(item._id, 1)} />
                            </Space>
                          </div>
                        ))}
                        <Input
                          className="mt-3"
                          placeholder="Ghi chú cho quầy (không bắt buộc)"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <Text strong>Tạm tính giỏ món mới: {formatMoney(cartTotal)}</Text>
                          <Button loading={ordering} disabled={selectedTable.checkoutState !== "open"} onClick={() => void sendOrder()}>
                            Gửi món
                          </Button>
                        </div>
                      </div>
                    )}
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
                    <div className="space-y-3">
                      <SummaryRow label="Tiền bàn" value={formatMoney(quote.playingCost)} />
                      <SummaryRow label="F&B" value={formatMoney(quote.fnbTotal)} />
                      <SummaryRow label="Tạm tính" value={formatMoney(quote.subtotal)} />
                      <SummaryRow
                        label={`Ưu đãi hạng ${quote.tier.name}`}
                        value={`−${formatMoney(quote.membershipDiscountAmount)}`}
                        positive
                      />
                      {quote.voucherDiscountAmount > 0 && (
                        <SummaryRow label={`Voucher ${("voucherCode" in quote ? quote.voucherCode : undefined) ?? appliedVoucherCode}`} value={`−${formatMoney(quote.voucherDiscountAmount)}`} positive />
                      )}
                      {quote.deposit > 0 && <SummaryRow label="Tiền cọc" value={`−${formatMoney(quote.deposit)}`} positive />}
                      <div className="border-t border-slate-200 pt-3">
                        <SummaryRow label="Cần thanh toán" value={formatMoney(quote.totalDue)} strong />
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="flex justify-between">
                          <Text type="secondary">Ưu đãi bàn / F&B</Text>
                          <Text>{quote.tier.tableDiscountPercent}% / {quote.tier.fnbDiscountPercent}%</Text>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <Text type="secondary">Số dư ví</Text>
                          <Text strong>{formatMoney(quote.walletBalance)}</Text>
                        </div>
                      </div>
                      <Space.Compact className="w-full">
                        <Input
                          placeholder="Mã voucher"
                          value={voucherCode}
                          onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
                          disabled={selectedTable.checkoutState !== "open"}
                        />
                        <Button loading={applyingVoucher} onClick={() => void applyVoucher()} disabled={selectedTable.checkoutState !== "open"}>
                          Áp dụng
                        </Button>
                      </Space.Compact>
                      <Select<PaymentMethod>
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        className="w-full"
                        disabled={selectedTable.checkoutState !== "open"}
                        options={[
                          { value: "member_balance", label: "Ví trả trước hội viên" },
                          { value: "cash", label: "Tiền mặt — chờ nhân viên" },
                          { value: "transfer", label: "Chuyển khoản — chờ đối soát" },
                        ]}
                      />
                      <Button
                        block
                        size="lg"
                        loading={paying}
                        disabled={selectedTable.checkoutState !== "open"}
                        icon={paymentMethod === "member_balance" ? <WalletOutlined /> : <CheckCircleOutlined />}
                        onClick={() => void submitCheckout()}
                      >
                        {paymentMethod === "member_balance" ? "Thanh toán bằng ví" : "Gửi yêu cầu thanh toán"}
                      </Button>
                      {paymentMethod !== "member_balance" && (
                        <Text type="secondary" className="block text-xs">
                          Hóa đơn chỉ hoàn tất sau khi nhân viên nhận tiền hoặc xác nhận chuyển khoản.
                        </Text>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}
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
