import React, { useState, useEffect, useCallback } from "react";
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  Tag,
  Modal,
  Form,
  message,
  type TableColumnsType,
} from "../../shared/ui";
import {
  accessoryWasteService,
  type AccessoryWasteItem,
  type WasteAuditStat,
} from "../../services/accessory-waste.service";
import api from "../../services/api";

const REASON_OPTIONS = [
  { label: "Cơ cong / Gãy ngọn / Bong phíp", value: "Cơ cong / Gãy ngọn / Bong phíp" },
  { label: "Mẻ bóng / Bi nứt vỡ", value: "Mẻ bóng / Bi nứt vỡ" },
  { label: "Mòn lơ / Lơ ẩm mốc", value: "Mòn lơ / Lơ ẩm mốc" },
  { label: "Rách bao tay / Hỏng khóa", value: "Rách bao tay / Hỏng khóa" },
  { label: "Rách vải bàn / Mòn băng", value: "Rách vải bàn / Mòn băng" },
  { label: "Hao mòn tự nhiên trong thi đấu", value: "Hao mòn tự nhiên trong thi đấu" },
  { label: "Khác", value: "Khác" },
];

export const AccessoryWastePage: React.FC = () => {
  const [items, setItems] = useState<AccessoryWasteItem[]>([]);
  const [stats, setStats] = useState<{
    totalDisposalsCount: number;
    totalDamagedUnits: number;
    products: WasteAuditStat[];
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Product list for select
  const [accessories, setAccessories] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes, prodRes] = await Promise.all([
        accessoryWasteService.getWastes({ search: searchTerm.trim() || undefined }),
        accessoryWasteService.getWasteStats().catch(() => null),
        api.get("/products", { params: { category: "accessory", limit: 100 } }).catch(() => null),
      ]);

      if (listRes?.data) {
        setItems(listRes.data);
      }
      if (statsRes) {
        setStats(statsRes);
      }
      if (prodRes?.data?.data?.items) {
        setAccessories(prodRes.data.data.items);
      } else if (Array.isArray(prodRes?.data?.data)) {
        setAccessories(prodRes.data.data);
      }
    } catch (err: any) {
      console.error("Lỗi tải danh sách xuất hủy:", err);
      message.error("Không thể tải danh sách xuất hủy phụ kiện.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProductSelect = (productId: string) => {
    const p = accessories.find((item) => item._id === productId || item.id === productId);
    setSelectedProduct(p || null);
    form.setFieldsValue({ quantity: 1 });
  };

  const handleCreateSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      await accessoryWasteService.createWaste({
        productId: values.productId,
        quantity: Number(values.quantity),
        reason: values.reason === "Khác" && values.customReason ? values.customReason : values.reason,
        note: values.note,
      });

      message.success("Ghi nhận xuất hủy phụ kiện thành công!");
      setModalVisible(false);
      form.resetFields();
      setSelectedProduct(null);
      loadData();
    } catch (err: any) {
      console.error("Lỗi xuất hủy:", err);
      message.error(err?.response?.data?.message || "Không thể thực hiện xuất hủy phụ kiện.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumnsType<AccessoryWasteItem> = [
    {
      title: "Mã phiếu",
      dataIndex: "disposalNumber",
      key: "disposalNumber",
      width: 150,
      render: (num: string) => (
        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          {num}
        </span>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (date: string) => new Date(date).toLocaleString("vi-VN"),
    },
    {
      title: "Phụ kiện",
      dataIndex: "product",
      key: "product",
      render: (p: any) => (
        <div>
          <div className="font-semibold text-slate-900">{p?.name || "Phụ kiện"}</div>
          <div className="text-xs text-slate-400 font-mono">SKU: {p?.sku}</div>
        </div>
      ),
    },
    {
      title: "Số lượng hủy",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: 110,
      render: (qty: number, record) => (
        <span className="font-bold text-rose-600 font-mono">
          -{qty} {record.product?.unit || "cái"}
        </span>
      ),
    },
    {
      title: "Biến động tồn",
      key: "stockChange",
      align: "center",
      width: 130,
      render: (_: any, record) => (
        <span className="text-xs font-mono">
          <span className="text-slate-500">{record.previousStock}</span>
          <span className="text-slate-400 mx-1">→</span>
          <span className="font-bold text-slate-900">{record.newStock}</span>
        </span>
      ),
    },
    {
      title: "Lý do hư hỏng",
      dataIndex: "reason",
      key: "reason",
      render: (reason: string, record) => (
        <div>
          <span className="font-medium text-slate-800">{reason}</span>
          {record.note && (
            <div className="text-xs text-slate-400 italic">Ghi chú: {record.note}</div>
          )}
        </div>
      ),
    },
    {
      title: "Người thực hiện",
      dataIndex: "performedBy",
      key: "performedBy",
      width: 150,
      render: (user: any) => (
        <span className="text-xs text-slate-600 font-medium">
          {user?.name || user?.email || "Thủ kho"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-2 sm:p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
              <DeleteOutlined className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Ghi nhận Xuất Hủy & Hao mòn Phụ kiện
              </h1>
              <p className="text-sm text-slate-500">
                Ghi nhận trừ tồn kho các phụ kiện bida bị cong gãy, mẻ bóng, mòn lơ và theo dõi tỷ lệ hao hụt tài sản.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedProduct(null);
              form.resetFields();
              setModalVisible(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 border-none font-semibold text-white shadow-sm"
          >
            Lập phiếu xuất hủy
          </Button>
        </div>
      </div>

      {/* KPI Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Tổng số đợt xuất hủy
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.totalDisposalsCount || items.length} đợt
          </div>
          <div className="text-xs text-slate-400 mt-1">Đã được ghi vào sổ cái WASTE</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100 bg-rose-50/20 shadow-xs">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
            Tổng số phụ kiện hư hỏng
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {stats?.totalDamagedUnits ||
              items.reduce((sum, item) => sum + (item.quantity || 0), 0)}{" "}
            món
          </div>
          <div className="text-xs text-rose-500/80 mt-1">Khấu trừ khỏi tài sản CLB</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-100 bg-amber-50/20 shadow-xs">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            Theo dõi hao hụt tài sản
          </div>
          <div className="text-sm font-semibold text-amber-800 mt-1">
            {stats?.products && stats.products.length > 0
              ? `${stats.products.length} loại phụ kiện có phát sinh hao hụt`
              : "Tỷ lệ hao hụt trong mức an toàn"}
          </div>
          <div className="text-xs text-slate-400 mt-1">Tự động cập nhật vào sổ cái</div>
        </div>
      </div>

      {/* Audit Stats list if any */}
      {stats?.products && stats.products.length > 0 && (
        <Card className="rounded-2xl shadow-xs border-amber-200 bg-amber-50/10">
          <div className="flex items-center gap-2 mb-3">
            <AuditOutlined className="text-amber-600 font-bold" />
            <h3 className="text-sm font-bold text-slate-900 mb-0">
              Audit log: Tỷ lệ hao hụt theo từng loại phụ kiện
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.products.map((p) => (
              <div
                key={p.productId}
                className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1"
              >
                <div className="font-bold text-slate-900 truncate">{p.name}</div>
                <div className="text-slate-500 flex justify-between">
                  <span>Tồn hiện tại:</span>
                  <span className="font-semibold">{p.currentStock} {p.unit}</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Đã hủy:</span>
                  <span className="font-bold text-rose-600">{p.totalWasteQuantity} {p.unit}</span>
                </div>
                <div className="text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Tỷ lệ hao hụt:</span>
                  <Tag color={p.wasteRatePercent > 15 ? "red" : "orange"}>
                    {p.wasteRatePercent}%
                  </Tag>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Table Toolbar */}
      <Card className="rounded-2xl shadow-xs border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Input
            placeholder="Tìm theo mã phiếu, tên phụ kiện, lý do..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={loadData}
            className="w-80"
            allowClear
          />
          <div className="text-xs text-slate-400">
            Tổng cộng: {items.length} phiếu xuất hủy
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl shadow-xs border-slate-200 overflow-hidden">
        <Table<AccessoryWasteItem>
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
          className="border border-slate-100 rounded-xl"
        />
      </Card>

      {/* Modal Lập phiếu xuất hủy */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-700">
            <DeleteOutlined />
            <span>Lập Phiếu Xuất Hủy Phụ Kiện Hư Hỏng</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit} className="mt-4">
          <Form.Item
            name="productId"
            label="Chọn phụ kiện hư hỏng"
            rules={[{ required: true, message: "Vui lòng chọn phụ kiện!" }]}
          >
            <Select
              placeholder="-- Chọn phụ kiện bida cần xuất hủy --"
              onChange={handleProductSelect}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={accessories.map((a) => ({
                label: `${a.name} (SKU: ${a.sku}) - Tồn: ${a.stock ?? 0} ${a.unit || "cái"}`,
                value: a._id || a.id,
              }))}
            />
          </Form.Item>

          {selectedProduct && (
            <div className="p-3 bg-slate-50 rounded-xl mb-4 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn kho hiện tại:</span>
                <span className="font-bold text-slate-800">
                  {selectedProduct.stock ?? 0} {selectedProduct.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đơn giá vốn:</span>
                <span className="font-mono">
                  {(selectedProduct.costPrice ?? 0).toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>
          )}

          <Form.Item
            name="quantity"
            label="Số lượng xuất hủy"
            rules={[
              { required: true, message: "Vui lòng nhập số lượng!" },
              {
                validator: async (_, value) => {
                  const num = Number(value);
                  if (!num || num <= 0 || !Number.isInteger(num)) {
                    throw new Error("Số lượng phải là số nguyên dương!");
                  }
                  if (selectedProduct && num > (selectedProduct.stock ?? 0)) {
                    throw new Error(
                      `Số lượng hủy (${num}) không được vượt quá tồn kho (${selectedProduct.stock ?? 0})!`,
                    );
                  }
                },
              },
            ]}
          >
            <Input type="number" min={1} placeholder="Ví dụ: 1, 2, 5..." />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do hư hỏng (Bắt buộc)"
            rules={[{ required: true, message: "Bắt buộc phải nhập lý do hư hỏng!" }]}
          >
            <Select placeholder="-- Chọn nguyên nhân hư hỏng --" options={REASON_OPTIONS} />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.reason !== cur.reason}
          >
            {({ getFieldValue }) =>
              getFieldValue("reason") === "Khác" ? (
                <Form.Item
                  name="customReason"
                  label="Chi tiết nguyên nhân khác"
                  rules={[{ required: true, message: "Vui lòng ghi rõ nguyên nhân!" }]}
                >
                  <Input placeholder="Nhập lý do cụ thể..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={3} placeholder="Ghi chú vị trí bàn, sự cố, tình trạng..." />
          </Form.Item>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button onClick={() => setModalVisible(false)} disabled={submitting}>
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold border-none"
            >
              Xác nhận xuất hủy
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AccessoryWastePage;
