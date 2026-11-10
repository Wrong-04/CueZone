import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  CoffeeOutlined,
  ShoppingOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
  Space,
  Image,
  Pagination,
} from "../../shared/ui";
import { productService, type ProductMenu as Product } from "../../services/product.service";
import {
  customerOrderService,
  type ActiveOrderTable,
  type CustomerOrder,
} from "../../services/customer-order.service";
import { getSocket } from "../../services/socket.service";

const { Title, Text, Paragraph } = Typography;

const normalizeCategory = (category?: string) => category?.trim().toLocaleLowerCase("vi-VN") ?? "";

const getCategoryLabel = (category: string) => {
  const norm = normalizeCategory(category);
  const labels: Record<string, string> = {
    drink: "Đồ uống",
    food: "Món ăn",
    snack: "Ăn vặt",
    accessory: "Phụ kiện bida",
    coffee: "Cà phê",
  };

  if (labels[norm]) return labels[norm];
  if (/^[0-9a-fA-F]{24}$/.test(norm)) return "Món khác";
  return category;
};

const getFallbackImage = (item: Product) => {
  const category = normalizeCategory(item.category);
  const name = item.name.toLocaleLowerCase("vi-VN");

  if (category === "drink" && /bia|beer/.test(name)) {
    return "/fnb/fnb-cold-beer.jpg";
  }
  if (category === "drink" && /cà phê|coffee/.test(name)) {
    return "/fnb/fnb-salt-coffee.jpg";
  }
  if (category === "accessory") return "/fnb/fnb-salt-coffee.jpg";
  if (category === "drink") return "/fnb/fnb-peach-tea.jpg";
  if (category === "food") return "/fnb/fnb-beef-noodles.jpg";
  if (category === "snack") return "/fnb/fnb-beef-jerky.jpg";

  return "/fnb/fnb-salt-coffee.jpg";
};

interface CartItem {
  item: Product;
  quantity: number;
}

export const CustomerFnB: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryTableId = searchParams.get("tableId");

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTables, setActiveTables] = useState<ActiveOrderTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState<boolean>(false);
  const [recentOrder, setRecentOrder] = useState<CustomerOrder | null>(null);
  const [trackingError, setTrackingError] = useState("");
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const selectedTable = activeTables.find((table) => table.tableId === selectedTableId);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const response = await productService.getFnbMenu();
        setMenuItems(response);
      } catch (error: any) {
        message.error(error.message || "Đã xảy ra lỗi khi tải thực đơn");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user || user.role !== "customer") {
      setActiveTables([]);
      setSelectedTableId("");
      return;
    }
    const fetchTables = async () => {
      try {
        const tables = await customerOrderService.getActiveTables();
        if (!active) return;
        setActiveTables(tables);
        if (queryTableId && tables.some((table) => table.tableId === queryTableId)) {
          setSelectedTableId(queryTableId);
        } else {
          setSelectedTableId((current) =>
            tables.some((table) => table.tableId === current) ? current : (tables[0]?.tableId ?? ""),
          );
        }
      } catch (error) {
        if (active) {
          setActiveTables([]);
          console.error("Không thể xác nhận bàn đang chơi:", error);
        }
      }
    };
    const initialFetch = window.setTimeout(() => void fetchTables(), 0);
    const interval = window.setInterval(() => void fetchTables(), 15000);
    return () => {
      active = false;
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!recentOrder?._id || recentOrder.status === "served" || recentOrder.status === "rejected") {
      return;
    }
    let active = true;
    let timer: number;
    const refresh = async () => {
      try {
        const order = await customerOrderService.getMine(recentOrder._id);
        if (active) {
          setRecentOrder(order);
          setTrackingError("");
        }
      } catch (error) {
        if (active) setTrackingError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái order");
      }
      if (active) timer = window.setTimeout(refresh, 4000);
    };
    timer = window.setTimeout(refresh, 4000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recentOrder]);

  // Realtime Socket lắng nghe cập nhật trạng thái đơn món từ quầy (SCRUM-937)
  useEffect(() => {
    const socket = getSocket();
    const handleStatusChanged = (updatedOrder: CustomerOrder) => {
      if (recentOrder && updatedOrder._id === recentOrder._id) {
        setRecentOrder(updatedOrder);
        if (updatedOrder.status === "preparing") {
          message.success("Quầy đã tiếp nhận và đang pha chế đơn món của bạn!");
        } else if (updatedOrder.status === "ready") {
          message.info("Món của bạn đã sẵn sàng và đang được mang ra bàn!");
        } else if (updatedOrder.status === "rejected") {
          message.error(
            `Đơn món không được tiếp nhận: ${updatedOrder.rejectedReason || "Vui lòng liên hệ nhân viên phục vụ"}`,
          );
        }
      }
    };
    socket.on("customer-order:status_changed", handleStatusChanged);
    return () => {
      socket.off("customer-order:status_changed", handleStatusChanged);
    };
  }, [recentOrder]);

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((item) => normalizeCategory(item.category) === selectedCategory);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => {
      const norm = normalizeCategory(item.category);
      if (norm && !/^[0-9a-fA-F]{24}$/.test(norm)) {
        set.add(norm);
      }
    });
    return [
      { key: "all", label: "Tất Cả Món" },
      ...Array.from(set).map((cat) => ({
        key: cat,
        label: getCategoryLabel(cat),
      })),
    ];
  }, [menuItems]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to page 1 when category changes
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.item.salePrice * i.quantity, 0);

  const addToCart = (item: Product) => {
    if (item.isOutOfStock) {
      message.warning("Món này hiện đang hết hàng!");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.item._id === item._id);
      if (existing) {
        return prev.map((i) => (i.item._id === item._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
    message.success(`Đã thêm ${item.name} vào order`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((i) => {
            if (i.item._id === itemId) {
              const nextQty = i.quantity + delta;
              return nextQty > 0 ? { ...i, quantity: nextQty } : null;
            }
            return i;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const handleSendOrder = () => {
    if (cart.length === 0) {
      message.warning("Vui lòng chọn ít nhất 1 món vào danh sách order!");
      return;
    }
    if (!user || user.role !== "customer") {
      message.warning("Vui lòng đăng nhập tài khoản hội viên để gọi món tại bàn.");
      return;
    }
    if (!selectedTable) {
      message.warning("Tài khoản chưa được gắn với phiên bàn đang hoạt động.");
      return;
    }
    setShowConfirmOrder(true);
  };

  const confirmSendOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    setIsOrdering(true);
    try {
      setTrackingError("");
      const order = await customerOrderService.create({
        tableId: selectedTable.tableId,
        sessionId: selectedTable.sessionId,
        items: cart.map(({ item, quantity }) => ({ productId: item._id, quantity })),
        note,
      });
      setRecentOrder(order);
      setShowConfirmOrder(false);
      setShowOrderSuccessModal(true);
      setCart([]);
      setNote("");
      message.success("Order đã được gửi tới quầy.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể gửi order");
      try {
        const tables = await customerOrderService.getActiveTables();
        setActiveTables(tables);
      } catch (refreshError) {
        message.error(
          refreshError instanceof Error ? refreshError.message : "Không thể tải lại bàn đang chơi",
        );
      }
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="space-y-6">
      {selectedTable && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <ThunderboltOutlined />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                Phiên bàn đang hoạt động
              </div>
              <div className="text-sm font-black text-slate-800">
                {selectedTable.tableCode} · {selectedTable.tableName}
              </div>
            </div>
          </div>
          <Link
            to="/customer/session"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl transition shadow-xs"
          >
            <ArrowLeftOutlined /> Quay lại phiên chơi & thanh toán
          </Link>
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 text-white p-8 sm:p-10 border border-emerald-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full opacity-10 bg-radial-gradient pointer-events-none" />
        <div className="max-w-2xl space-y-3 relative z-10">
          <Tag color="green" className="!text-xs !font-bold !px-3 !py-1 !rounded-md uppercase">
            <CoffeeOutlined className="mr-1.5" /> DỊCH VỤ F&B TẠI BÀN
          </Tag>
          <Title
            level={1}
            className="!text-2xl sm:!text-4xl !font-black !text-white !mb-1 tracking-tight"
          >
            Menu Đồ Uống & Ẩm Thực Cơ Thủ
          </Title>
          <Paragraph className="!text-xs sm:!text-sm !text-slate-300 leading-relaxed !mb-0">
            Gọi món trực tiếp tại bàn bida chỉ với 1 chạm. Quầy Bar và bếp CueZone chế biến nhanh
            chóng, phục vụ tận nơi giúp bạn giữ trọn nhịp trận đấu.
          </Paragraph>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          {categoryOptions.map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? "primary" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(cat.key)}
              className={`!text-xs !h-8 !px-3.5 !rounded-xl transition-all ${
                selectedCategory === cat.key
                  ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-xs"
                  : "!border-slate-200 !bg-white !text-slate-600 hover:!border-slate-300"
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <Text className="!text-xs !text-slate-400">
          Hiển thị {filteredItems.length} món trong menu
        </Text>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {isLoading ? (
          <div className="lg:col-span-8 flex justify-center py-20">
            <Text className="!text-slate-400 animate-pulse italic">
              Đang tải thực đơn hấp dẫn... Vui lòng đợi trong giây lát
            </Text>
          </div>
        ) : (
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {paginatedItems.length === 0 ? (
                <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
                  <Text className="!text-sm !text-slate-500">
                    Không có món nào trong danh mục này.
                  </Text>
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <Card
                    key={item._id}
                    className={`!rounded-2xl !border-slate-200 !bg-white hover:!shadow-md transition-all overflow-hidden flex flex-col justify-between group p-0 ${
                      item.isOutOfStock ? "!opacity-75" : ""
                    }`}
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Text className="!text-[11px] !text-emerald-700 font-semibold uppercase tracking-wider block">
                              {getCategoryLabel(item.category)}
                            </Text>
                            {item.isOutOfStock && (
                              <Tag
                                color="error"
                                className="!text-[10px] !font-bold !px-2 !py-0.5 !rounded-md uppercase"
                              >
                                HẾT HÀNG
                              </Tag>
                            )}
                          </div>
                          <Text
                            strong
                            className="!text-sm !text-slate-900 block group-hover:text-emerald-600 transition"
                          >
                            {item.name}
                          </Text>
                        </div>
                      </div>

                      <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-slate-100">
                        <Image
                          src={item.imageUrl || getFallbackImage(item)}
                          fallback={getFallbackImage(item)}
                          alt={item.name}
                          width="100%"
                          height="100%"
                          style={{ objectFit: "cover" }}
                          preview={true}
                        />
                      </div>

                      <Paragraph className="!text-xs !text-slate-500 !mb-0 line-clamp-2 leading-relaxed">
                        {item.description}
                      </Paragraph>
                    </div>

                    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <Text
                          strong
                          className={`!text-base font-black ${item.isOutOfStock ? "!text-slate-400" : "!text-emerald-600"}`}
                        >
                          {item.salePrice.toLocaleString("vi-VN")}đ
                        </Text>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<PlusOutlined />}
                        onClick={() => addToCart(item)}
                        disabled={item.isOutOfStock}
                        className={`!text-xs !h-8 !px-3 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl ${
                          item.isOutOfStock ? "!opacity-50 !cursor-not-allowed" : ""
                        }`}
                      >
                        Thêm Món
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-4">
                <Pagination
                  current={currentPage}
                  total={filteredItems.length}
                  pageSize={itemsPerPage}
                  onChange={(page) => setCurrentPage(page)}
                  className="!bg-transparent"
                />
              </div>
            )}
          </div>
        )}

        <div className="lg:col-span-4 sticky top-24">
          <Card className="!rounded-2xl !border-slate-200 !bg-white !shadow-sm overflow-hidden p-0">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <Space align="center" size={8}>
                <ShoppingOutlined className="text-lg text-emerald-400" />
                <Text strong className="!text-sm !text-white">
                  Gọi Món Cho Bàn Chơi
                </Text>
              </Space>
              <Tag color="green" className="!font-bold !text-xs !rounded-md">
                {totalItems} món
              </Tag>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phục vụ tới bàn:
                </label>
                <Select
                  value={selectedTableId || undefined}
                  onChange={(val) => setSelectedTableId(val as string)}
                  className="w-full !rounded-xl"
                  disabled={!activeTables.length}
                  placeholder={
                    user
                      ? "Không tìm thấy phiên bàn đang sử dụng"
                      : "Đăng nhập để xác nhận bàn"
                  }
                  options={activeTables.map((table) => ({
                    value: table.tableId,
                    label: `${table.tableName} (${table.tableCode}) · ${table.status === "paused" ? "Tạm dừng" : "Đang chơi"}`,
                  }))}
                />
                {user && !activeTables.length && (
                  <p className="mt-1 text-[11px] text-amber-700 leading-relaxed">
                    Chưa có bàn chơi liên kết với số điện thoại <strong className="font-mono">{user.phone}</strong>. Vui lòng nhắc thu ngân mở bàn bằng số điện thoại này để gọi món tại bàn nhé!
                  </p>
                )}
                {!user && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Đăng nhập tài khoản hội viên để tự động kết nối bàn đang chơi và gọi món.
                  </p>
                )}
              </div>

              <div className="border-t border-b border-slate-100 py-3 min-h-[160px] max-h-[260px] overflow-y-auto space-y-3">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-2">
                    <CoffeeOutlined className="text-3xl text-slate-300" />
                    <span className="text-xs">Chưa có món nào được chọn.</span>
                    <span className="text-[11px] text-slate-400">
                      Nhấn "+ Thêm Món" để bắt đầu order
                    </span>
                  </div>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <div key={item._id} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex-1 pr-2">
                        <Text strong className="!text-xs !text-slate-800 block truncate">
                          {item.name}
                        </Text>
                        <Text className="!text-[11px] !text-emerald-600 font-semibold">
                          {(item.salePrice * quantity).toLocaleString("vi-VN")}đ
                        </Text>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item._id, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-600 transition"
                        >
                          {quantity === 1 ? (
                            <DeleteOutlined className="text-[10px] text-red-500" />
                          ) : (
                            <MinusOutlined className="text-[10px]" />
                          )}
                        </button>
                        <span className="w-5 text-center font-bold text-slate-800">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item._id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-600 transition"
                        >
                          <PlusOutlined className="text-[10px]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ghi chú chế biến:
                </label>
                <Input
                  placeholder="Ví dụ: Ít đường, nhiều đá, mang kèm ly đá..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="!text-xs !rounded-xl"
                />
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <Text className="!text-xs !text-slate-500">Tạm tính tiền F&B:</Text>
                  <Text strong className="!text-lg !text-emerald-600 font-black">
                    {totalPrice.toLocaleString("vi-VN")} VNĐ
                  </Text>
                </div>

                <Button
                  variant="primary"
                  loading={isOrdering}
                  disabled={cart.length === 0 || !activeTables.length || !user}
                  onClick={handleSendOrder}
                  rightIcon={<ThunderboltOutlined />}
                  className="!w-full !h-11 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/20"
                >
                  Xác Nhận Gửi Order
                </Button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Order chỉ được tính vào hóa đơn sau khi quầy xác nhận. Bạn có thể theo dõi tiến độ
                  ngay sau khi gửi.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={showConfirmOrder}
        onCancel={() => setShowConfirmOrder(false)}
        title="Xác nhận bàn và order"
        footer={[
          <Button key="cancel" variant="outline" onClick={() => setShowConfirmOrder(false)}>
            Quay lại
          </Button>,
          <Button
            key="confirm"
            variant="primary"
            loading={isOrdering}
            disabled={!selectedTable}
            onClick={() => void confirmSendOrder()}
          >
            Gửi order
          </Button>,
        ]}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Xác nhận order được phục vụ tại phiên bàn bạn đang sử dụng:
          </p>
          <Select
            value={selectedTableId || undefined}
            onChange={(value) => setSelectedTableId(value as string)}
            className="w-full"
            options={activeTables.map((table) => ({
              value: table.tableId,
              label: `${table.tableName} (${table.tableCode})`,
            }))}
          />
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>{totalItems} món</span>
              <strong>{totalPrice.toLocaleString("vi-VN")}đ</strong>
            </div>
            {cart.map(({ item, quantity }) => (
              <div key={item._id} className="mt-1 flex justify-between text-xs text-slate-600">
                <span>{item.name} x{quantity}</span>
                <span>{(item.salePrice * quantity).toLocaleString("vi-VN")}đ</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Order ở trạng thái chờ xác nhận và chỉ được cộng vào hóa đơn sau khi quầy nhận món.
          </p>
        </div>
      </Modal>

      <Modal
        open={showOrderSuccessModal}
        onCancel={() => setShowOrderSuccessModal(false)}
        footer={[
          <Button
            key="continue"
            variant="outline"
            onClick={() => setShowOrderSuccessModal(false)}
            className="!text-xs !rounded-xl"
          >
            Tiếp Tục Chọn Món
          </Button>,
          <Button
            key="session"
            variant="primary"
            to="/customer/session"
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Xem Phiên Chơi & Tạm Tính →
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            {recentOrder?.status === "rejected" ? (
              <ClockCircleOutlined className="text-rose-600 text-lg" />
            ) : (
              <CheckCircleOutlined className="text-emerald-600 text-lg" />
            )}
            <span className="text-slate-900 font-bold">Theo dõi order tại bàn</span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-sm text-slate-700">
          <p>
            Mã order: <strong>{recentOrder?.orderCode}</strong> · Bàn:{" "}
            <strong>{recentOrder?.tableName} ({recentOrder?.tableCode})</strong>
          </p>
          <div
            className={`rounded-2xl border p-4 ${recentOrder?.status === "rejected" ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}
          >
            <div>
              <ClockCircleOutlined className="mr-2 text-emerald-600" />
              <strong>{recentOrder?.statusMessage || "Đang lấy trạng thái order..."}</strong>
            </div>
            {trackingError && (
              <p className="text-xs text-rose-600">
                {trackingError} — hệ thống sẽ tiếp tục thử cập nhật trạng thái.
              </p>
            )}
            {recentOrder?.rejectedReason && (
              <p className="mt-2 text-xs text-rose-700">Lý do: {recentOrder.rejectedReason}</p>
            )}
          </div>
          <div className="space-y-1 text-xs text-slate-600">
            {recentOrder?.items.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <span>{item.name} x{item.quantity}</span>
                <span>{(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
              <span>Tạm tính</span>
              <span>{(recentOrder?.totalAmount ?? 0).toLocaleString("vi-VN")}đ</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Trạng thái được tự động cập nhật khi quầy xử lý order.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerFnB;
