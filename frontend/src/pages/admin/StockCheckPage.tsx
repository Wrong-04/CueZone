import React, { useState, useEffect, useCallback } from "react";
import {
  AuditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  SendOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
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
  stockCheckService,
  type StockCheckSession,
  type StockCheckItem,
  type StockCheckStatus,
} from "../../services/stock-check.service";
import { useAuth } from "../../contexts/AuthContext";
import { hasPermission } from "../../utils/permissions";

export const StockCheckPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = hasPermission(user, "inventory.manage");
  const [sessions, setSessions] = useState<StockCheckSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal tạo đợt kiểm kê
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [createForm] = Form.useForm();

  // Modal chi tiết kiểm đếm
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<StockCheckSession | null>(null);
  const [countsMap, setCountsMap] = useState<Record<string, { actualStock: number; note?: string }>>({});
  const [savingCounts, setSavingCounts] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stockCheckService.getStockChecks({
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (res?.data) {
        setSessions(res.data);
      }
    } catch (err: any) {
      console.error("Lỗi tải danh sách đợt kiểm kê:", err);
      message.error("Không thể tải danh sách đợt kiểm kê.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreateSubmit = async (values: any) => {
    try {
      setCreating(true);
      const created = await stockCheckService.createStockCheck({
        title: values.title,
        category: values.category || "all",
        note: values.note,
      });

      message.success(`Đã khởi tạo đợt kiểm kê ${created.checkCode} thành công!`);
      setCreateModalVisible(false);
      createForm.resetFields();
      await loadSessions();

      // Mở ngay đợt vừa tạo để kiểm đếm
      handleOpenDetail(created);
    } catch (err: any) {
      console.error("Lỗi tạo đợt kiểm kê:", err);
      message.error(err?.response?.data?.message || "Không thể tạo đợt kiểm kê.");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDetail = async (session: StockCheckSession) => {
    try {
      // Reload chi tiết mới nhất
      const full = await stockCheckService.getStockCheckById(session._id);
      setActiveSession(full);

      // Khởi tạo countsMap từ dữ liệu hiện có
      const initialMap: Record<string, { actualStock: number; note?: string }> = {};
      full.items.forEach((item) => {
        initialMap[item.product.toString()] = {
          actualStock: item.actualStock !== null ? item.actualStock : item.systemStock,
          note: item.note || "",
        };
      });
      setCountsMap(initialMap);
      setDetailModalVisible(true);
    } catch (err: any) {
      message.error("Không thể tải chi tiết đợt kiểm kê.");
    }
  };

  const handleCountChange = (productId: string, val: number) => {
    setCountsMap((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        actualStock: Math.max(0, val),
      },
    }));
  };

  const handleNoteChange = (productId: string, noteVal: string) => {
    setCountsMap((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        note: noteVal,
      },
    }));
  };

  const handleSaveCounts = async (submitAfter: boolean = false) => {
    if (!activeSession) return;
    try {
      setSavingCounts(true);
      const countsPayload = Object.entries(countsMap).map(([pId, val]) => ({
        productId: pId,
        actualStock: val.actualStock,
        note: val.note,
      }));

      const updated = await stockCheckService.updateCounts(
        activeSession._id,
        countsPayload,
        submitAfter,
      );

      setActiveSession(updated);
      message.success(
        submitAfter
          ? "Đã nộp phiếu kiểm kê thành công! Chờ Quản lý duyệt cân bằng."
          : "Đã lưu số lượng kiểm đếm thành công.",
      );
      loadSessions();
    } catch (err: any) {
      console.error("Lỗi cập nhật kiểm đếm:", err);
      message.error(err?.response?.data?.message || "Không thể lưu số lượng kiểm đếm.");
    } finally {
      setSavingCounts(false);
    }
  };

  const handleApproveBalance = async () => {
    if (!activeSession) return;
    try {
      setApproving(true);
      const approved = await stockCheckService.approveStockCheck(activeSession._id);
      setActiveSession(approved);
      message.success(
        `Đã duyệt cân bằng kho đợt ${approved.checkCode}! Số tồn kho hệ thống đã được cập nhật chuẩn xác.`,
      );
      loadSessions();
    } catch (err: any) {
      console.error("Lỗi duyệt cân bằng kho:", err);
      message.error(err?.response?.data?.message || "Không thể duyệt cân bằng kho.");
    } finally {
      setApproving(false);
    }
  };

  const getStatusTag = (status: StockCheckStatus) => {
    const map: Record<StockCheckStatus, { label: string; color: string }> = {
      draft: { label: "Đang kiểm đếm", color: "orange" },
      submitted: { label: "Chờ duyệt cân bằng", color: "blue" },
      completed: { label: "Đã hoàn tất", color: "green" },
      cancelled: { label: "Đã hủy", color: "default" },
    };
    const s = map[status] || { label: status, color: "default" };
    return <Tag color={s.color} className="!font-bold !rounded-md">{s.label}</Tag>;
  };

  const mainColumns: TableColumnsType<StockCheckSession> = [
    {
      title: "Mã đợt",
      dataIndex: "checkCode",
      key: "checkCode",
      width: 160,
      render: (code: string) => (
        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {code}
        </span>
      ),
    },
    {
      title: "Tiêu đề đợt kiểm kê",
      dataIndex: "title",
      key: "title",
      render: (title: string, record) => (
        <div>
          <div className="font-bold text-slate-900">{title}</div>
          <div className="text-xs text-slate-400">
            Ngành: {record.category === "all" ? "Tất cả hàng hóa" : record.category}
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 170,
      render: (status: StockCheckStatus) => getStatusTag(status),
    },
    {
      title: "Kết quả kiểm đếm",
      key: "resultSummary",
      width: 220,
      render: (_: any, record) => (
        <div className="text-xs space-y-0.5 font-mono">
          <div className="text-slate-600">Tổng: {record.summary.totalItems} mặt hàng</div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">Khớp: {record.summary.matchedItems}</span>
            <span className="text-blue-600 font-bold">Thừa: {record.summary.surplusItems}</span>
            <span className="text-rose-600 font-bold">Thiếu: {record.summary.deficitItems}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Người tạo",
      dataIndex: "createdBy",
      key: "createdBy",
      width: 150,
      render: (user: any) => (
        <span className="text-xs text-slate-600 font-medium">
          {user?.name || user?.email || "Thủ kho"}
        </span>
      ),
    },
    {
      title: "Thời gian tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (date: string) => new Date(date).toLocaleString("vi-VN"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 110,
      align: "center",
      render: (_: any, record) => (
        <Button
          size="small"
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetail(record)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
        >
          {record.status === "draft" ? "Kiểm đếm" : "Xem chi tiết"}
        </Button>
      ),
    },
  ];

  // ── Columns trong bảng chi tiết kiểm đếm (SCRUM-1067) ──────────────────────
  const detailColumns: TableColumnsType<StockCheckItem> = [
    {
      title: "STT",
      key: "idx",
      width: 50,
      align: "center",
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Mã SKU",
      dataIndex: "sku",
      key: "sku",
      width: 110,
      render: (sku: string) => <span className="font-mono font-bold text-slate-800">{sku}</span>,
    },
    {
      title: "Tên mặt hàng",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <div className="font-semibold text-slate-900">{name}</div>
          <div className="text-xs text-slate-400">ĐVT: {record.unit}</div>
        </div>
      ),
    },
    {
      title: "Tồn hệ thống",
      dataIndex: "systemStock",
      key: "systemStock",
      align: "right",
      width: 110,
      render: (sys: number) => (
        <span className="font-bold text-slate-700 font-mono">{sys.toLocaleString("vi-VN")}</span>
      ),
    },
    {
      title: "Thực tế đếm được",
      key: "actualStockInput",
      align: "right",
      width: 140,
      render: (_: any, record) => {
        const pId = record.product.toString();
        const currentCount = countsMap[pId]?.actualStock ?? record.systemStock;
        const isEditable = activeSession?.status === "draft" || activeSession?.status === "submitted";

        return isEditable ? (
          <Input
            type="number"
            min={0}
            value={currentCount}
            onChange={(e) => handleCountChange(pId, Number(e.target.value))}
            className="w-24 text-right font-mono font-bold"
          />
        ) : (
          <span className="font-black text-slate-900 font-mono">
            {record.actualStock !== null ? record.actualStock.toLocaleString("vi-VN") : "--"}
          </span>
        );
      },
    },
    {
      title: "Chênh lệch (Variance)",
      key: "variance",
      align: "center",
      width: 150,
      render: (_: any, record) => {
        const pId = record.product.toString();
        const curCount = countsMap[pId]?.actualStock ?? (record.actualStock ?? record.systemStock);
        const diff = curCount - record.systemStock;

        if (diff === 0) {
          return <Tag color="green" className="!font-mono !font-bold">Khớp (0)</Tag>;
        }
        if (diff > 0) {
          return <Tag color="blue" className="!font-mono !font-bold">Thừa (+{diff})</Tag>;
        }
        return <Tag color="red" className="!font-mono !font-bold">Thiếu ({diff})</Tag>;
      },
    },
    {
      title: "Giá trị chênh lệch",
      key: "varianceValue",
      align: "right",
      width: 140,
      render: (_: any, record) => {
        const pId = record.product.toString();
        const curCount = countsMap[pId]?.actualStock ?? (record.actualStock ?? record.systemStock);
        const diff = curCount - record.systemStock;
        const val = diff * record.costPrice;

        return (
          <span
            className={`font-mono font-bold ${
              diff === 0
                ? "text-slate-400"
                : diff > 0
                ? "text-blue-600"
                : "text-rose-600"
            }`}
          >
            {val !== 0 ? `${val.toLocaleString("vi-VN")} đ` : "0 đ"}
          </span>
        );
      },
    },
    {
      title: "Ghi chú giải trình",
      key: "noteInput",
      render: (_: any, record) => {
        const pId = record.product.toString();
        const curNote = countsMap[pId]?.note ?? (record.note || "");
        const isEditable = activeSession?.status === "draft" || activeSession?.status === "submitted";

        return isEditable ? (
          <Input
            placeholder="Lý do chênh lệch..."
            value={curNote}
            onChange={(e) => handleNoteChange(pId, e.target.value)}
            className="text-xs"
          />
        ) : (
          <span className="text-xs text-slate-500 italic">{record.note || "--"}</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-2 sm:p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <AuditOutlined className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Kiểm kê Kho Hàng hóa Định kỳ & Cân bằng Tồn kho
              </h1>
              <p className="text-sm text-slate-500">
                Lập đợt kiểm kê, đối soát số lượng đếm thực tế với snapshot hệ thống và phê duyệt cân bằng kho bằng transaction atomic.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button icon={<ReloadOutlined />} onClick={loadSessions} loading={loading}>
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.resetFields();
              setCreateModalVisible(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 border-none font-semibold text-white shadow-sm"
          >
            Tạo đợt kiểm kê mới
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="rounded-2xl shadow-xs border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-48"
              options={[
                { label: "Tất cả trạng thái", value: "all" },
                { label: "Đang kiểm đếm (Draft)", value: "draft" },
                { label: "Chờ duyệt cân bằng (Submitted)", value: "submitted" },
                { label: "Đã hoàn tất cân bằng", value: "completed" },
                { label: "Đã hủy bỏ", value: "cancelled" },
              ]}
            />

            <Input
              placeholder="Tìm theo mã đợt KK, tiêu đề..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={loadSessions}
              className="w-72"
              allowClear
            />
          </div>

          <div className="text-xs text-slate-400">
            Tổng cộng: {sessions.length} đợt kiểm kê
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="rounded-2xl shadow-xs border-slate-200 overflow-hidden">
        <Table<StockCheckSession>
          columns={mainColumns}
          dataSource={sessions}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
          scroll={{ x: 900 }}
          className="border border-slate-100 rounded-xl"
        />
      </Card>

      {/* Modal Tạo đợt kiểm kê (SCRUM-1062, SCRUM-1065) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-700">
            <AuditOutlined />
            <span>Khởi Tạo Đợt Kiểm Kê Hàng Hóa Mới</span>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={540}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit} className="mt-4">
          <Form.Item
            name="title"
            label="Tiêu đề đợt kiểm kê"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề đợt kiểm kê!" }]}
          >
            <Input placeholder="Ví dụ: Kiểm kê định kỳ cuối tháng 11/2026" />
          </Form.Item>

          <Form.Item name="category" label="Ngành hàng cần kiểm kê" initialValue="all">
            <Select
              options={[
                { label: "Tất cả các ngành hàng trong kho", value: "all" },
                { label: "Chỉ ngành Phụ kiện bida", value: "accessory" },
                { label: "Chỉ ngành Đồ uống & Nước giải khát", value: "drink" },
                { label: "Chỉ ngành Đồ ăn nhanh & Snacks", value: "snack" },
                { label: "Chỉ ngành Thức ăn", value: "food" },
                { label: "Chỉ ngành Nguyên liệu chế biến", value: "ingredient" },
              ]}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú đợt kiểm kê">
            <Input.TextArea rows={3} placeholder="Ghi chú phạm vi quầy bar, kho phụ kiện..." />
          </Form.Item>

          <div className="p-3 bg-emerald-50 rounded-xl mb-4 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="font-bold">Lưu ý nghiệp vụ:</div>
            <div>
              Hệ thống sẽ chụp snapshot số lượng tồn kho hiện tại của tất cả mặt hàng tương ứng làm mốc đối soát.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button onClick={() => setCreateModalVisible(false)} disabled={creating}>
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold border-none"
            >
              Tạo và Bắt đầu kiểm đếm
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Chi tiết Kiểm đếm & Duyệt cân bằng (SCRUM-1064, SCRUM-1067, SCRUM-1068) */}
      <Modal
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 text-sm">
                {activeSession?.checkCode}
              </span>
              <span className="font-bold text-slate-900 text-base">{activeSession?.title}</span>
            </div>
            {activeSession && getStatusTag(activeSession.status)}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={1100}
        destroyOnHidden
      >
        {activeSession && (
          <div className="space-y-4 mt-3">
            {/* 4 Thống kê kết quả kiểm đếm */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">Tổng mặt hàng</div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {activeSession.summary.totalItems}
                </div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <div className="text-xs text-emerald-700 font-medium">Khớp hoàn toàn (0)</div>
                <div className="text-xl font-black text-emerald-700 font-mono">
                  {activeSession.summary.matchedItems}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                <div className="text-xs text-blue-700 font-medium">Thừa thực tế (+)</div>
                <div className="text-xl font-black text-blue-700 font-mono">
                  {activeSession.summary.surplusItems}
                </div>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                <div className="text-xs text-rose-700 font-medium">Thiếu hụt thực tế (-)</div>
                <div className="text-xl font-black text-rose-700 font-mono">
                  {activeSession.summary.deficitItems}
                </div>
              </div>
            </div>

            {/* Bảng nhập & đối soát chi tiết */}
            <Table<StockCheckItem>
              columns={detailColumns}
              dataSource={activeSession.items}
              rowKey="sku"
              pagination={{ pageSize: 8 }}
              scroll={{ x: 950 }}
              bordered
              className="border border-slate-100 rounded-xl"
            />

            {/* Hành động dưới chân modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {activeSession.status === "completed" && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircleOutlined /> Đợt kiểm kê đã hoàn tất và cân bằng tồn kho vào sổ cái.
                  </span>
                )}
                {activeSession.status === "submitted" && (
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <SafetyCertificateOutlined /> Phiếu đã nộp. Quản lý kho có thể kiểm tra và nhấn Duyệt cân bằng kho.
                  </span>
                )}
                {activeSession.status === "draft" && (
                  <span>Nhập số lượng đếm thực tế của từng sản phẩm, sau đó nhấn Nộp phiếu.</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={() => setDetailModalVisible(false)}>Đóng</Button>

                {activeSession.status === "draft" && (
                  <>
                    <Button
                      icon={<SaveOutlined />}
                      onClick={() => handleSaveCounts(false)}
                      loading={savingCounts}
                    >
                      Lưu nháp số lượng
                    </Button>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={() => handleSaveCounts(true)}
                      loading={savingCounts}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold border-none"
                    >
                      Nộp phiếu kiểm kê
                    </Button>
                  </>
                )}

                {activeSession.status === "submitted" && (
                  <>
                    <Button
                      icon={<SaveOutlined />}
                      onClick={() => handleSaveCounts(false)}
                      loading={savingCounts}
                    >
                      Cập nhật lại số đếm
                    </Button>
                    {isAdmin ? (
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleApproveBalance}
                        loading={approving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none shadow-sm"
                      >
                        Duyệt cân bằng kho
                      </Button>
                    ) : (
                      <Tag color="processing" className="!font-bold !py-1 !px-3 !rounded-md">
                        ⏳ Đang chờ Quản lý duyệt cân bằng
                      </Tag>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StockCheckPage;
