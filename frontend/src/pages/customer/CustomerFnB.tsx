import React, { useState, useEffect } from "react";
import {
  CoffeeOutlined,
  ShoppingOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
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

const { Title, Text, Paragraph } = Typography;

const normalizeCategory = (category?: string) => category?.trim().toLocaleLowerCase("vi-VN") ?? "";

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    drink: "Đồ uống",
    food: "Món ăn",
    snack: "Ăn vặt",
  };

  return labels[normalizeCategory(category)] ?? category;
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("TB-03");
  const [note, setNote] = useState<string>("");
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState<boolean>(false);
  const [recentOrderCode, setRecentOrderCode] = useState<string>("");
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((item) => normalizeCategory(item.category) === selectedCategory);

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
    setIsOrdering(true);
    setTimeout(() => {
      setIsOrdering(false);
      const code = "ORD-" + Math.floor(1000 + Math.random() * 9000);
      setRecentOrderCode(code);
      setShowOrderSuccessModal(true);
      setCart([]);
      setNote("");
    }, 800);
  };

  return (
    <div className="space-y-8">
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
          {[
            { key: "all", label: "Tất Cả Món" },
            { key: "drink", label: "Đồ Uống" },
            { key: "food", label: "Món Ăn" },
            { key: "snack", label: "Ăn Vặt" },
          ].map((cat) => (
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
                  value={selectedTable}
                  onChange={(val) => setSelectedTable(val as string)}
                  className="w-full !rounded-xl"
                  options={[
                    { value: "TB-01", label: "Bàn 01 (Standard 9FT)" },
                    { value: "TB-02", label: "Bàn 02 (Standard 9FT)" },
                    { value: "TB-03", label: "Bàn 03 (Standard 9FT - Bạn đang chơi)" },
                    { value: "TB-09", label: "Bàn 09 (VIP Bank Pool)" },
                    { value: "TB-10", label: "Bàn 10 (VIP Bank Pool)" },
                    { value: "TB-13", label: "Bàn 13 (Match K-Steel VAR)" },
                  ]}
                />
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
                  disabled={cart.length === 0}
                  onClick={handleSendOrder}
                  rightIcon={<ThunderboltOutlined />}
                  className="!w-full !h-11 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/20"
                >
                  Gửi Order Tới Quầy Bar
                </Button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Tiền đồ uống & thức ăn sẽ được tự động cộng vào hóa đơn thanh toán của bàn khi trả
                  bàn.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={showOrderSuccessModal}
        onCancel={() => setShowOrderSuccessModal(false)}
        footer={[
          <Button
            key="close"
            variant="primary"
            onClick={() => setShowOrderSuccessModal(false)}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Đã Hiểu & Đóng
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <CheckCircleOutlined className="text-emerald-600 text-lg" />
            <span className="text-slate-900 font-bold">Quầy Bar Đã Tiếp Nhận Order!</span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <p className="text-sm">
            Yêu cầu gọi món của bạn cho <strong>{selectedTable}</strong> đã được chuyển trực tiếp
            đến hệ thống màn hình quầy bar CueZone.
          </p>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div>
              <ClockCircleOutlined className="text-emerald-600 mr-2" />{" "}
              <strong>Mã đơn order:</strong> {recentOrderCode}
            </div>
            <div>
              <CoffeeOutlined className="text-emerald-600 mr-2" /> <strong>Bàn phục vụ:</strong>{" "}
              {selectedTable}
            </div>
            <div>
              <CheckCircleOutlined className="text-emerald-600 mr-2" />{" "}
              <strong>Thời gian dự kiến:</strong> Khoảng 3 - 5 phút
            </div>
          </div>
          <p className="text-slate-500">
            Nhân viên phục vụ sẽ mang đồ ăn/uống đến tận bàn cho bạn. Chúc bạn có trận đấu thăng
            hoa!
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerFnB;
