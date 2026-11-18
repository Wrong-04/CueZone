// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React, { useState } from "react";
import { CrownOutlined, EditOutlined } from "@ant-design/icons";
import {
  Button,
  Input,
  Modal,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from "../../../../shared/ui";
import type { ClubSettingsData, MemberTierPolicy } from "../types/settings.types";

const { Title, Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface MembershipPolicyTabProps {
  settings: ClubSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<ClubSettingsData>>;
}

// ============================================================================
// 4. MAIN COMPONENT: TAB CHÍNH SÁCH HỘI VIÊN & TÍCH ĐIỂM
// Quản lý các cấp bậc hội viên (Đồng, Bạc, Vàng, Kim Cương), tỷ lệ giảm giá và hạn mức tích lũy
// ============================================================================
export const MembershipPolicyTab: React.FC<MembershipPolicyTabProps> = ({
  settings,
  setSettings,
}) => {
  const [editingTier, setEditingTier] = useState<MemberTierPolicy | null>(null);
  const [isEditTierModalOpen, setIsEditTierModalOpen] = useState<boolean>(false);

  const handleOpenEditTier = (tier: MemberTierPolicy) => {
    setEditingTier({ ...tier });
    setIsEditTierModalOpen(true);
  };

  const handleSaveTier = () => {
    if (!editingTier) return;
    if (!editingTier.tierName.trim()) {
      message.error("Tên cấp bậc không được để trống!");
      return;
    }
    const updatedTiers = settings.memberTiers.map((t) =>
      t.tierKey === editingTier.tierKey ? editingTier : t
    );
    const newSettings = { ...settings, memberTiers: updatedTiers };
    setSettings(newSettings);
    localStorage.setItem("cuezone_admin_settings", JSON.stringify(newSettings));
    window.dispatchEvent(new Event("cuezone_settings_updated"));
    setIsEditTierModalOpen(false);
    setEditingTier(null);
    message.success(`Đã cập nhật chính sách cấp bậc "${editingTier.tierName}" thành công!`);
  };

  const tierColumns: TableColumnsType<MemberTierPolicy> = [
    {
      title: <span className="whitespace-nowrap font-bold">Cấp bậc hội viên</span>,
      key: "tierName",
      width: 170,
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Tag color={r.color as any} className="!font-bold !text-xs !px-2.5 !py-1 whitespace-nowrap">
            {r.tierName}
          </Tag>
        </div>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Điểm tích lũy tối thiểu</span>,
      key: "minPoints",
      width: 180,
      render: (_, r) => (
        <Text strong className="!text-slate-800 !text-xs font-semibold whitespace-nowrap">
          Từ {r.minPoints.toLocaleString("vi-VN")} điểm
        </Text>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Giảm giá tiền bàn</span>,
      key: "tableDiscountPercent",
      width: 150,
      render: (_, r) => (
        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 whitespace-nowrap inline-block">
          Giảm {r.tableDiscountPercent}%
        </span>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Giảm giá menu F&B</span>,
      key: "fnbDiscountPercent",
      width: 160,
      render: (_, r) => (
        <span
          className={`font-bold text-xs px-2.5 py-1 rounded-md border whitespace-nowrap inline-block ${
            r.fnbDiscountPercent > 0
              ? "text-blue-700 bg-blue-50 border-blue-200"
              : "text-slate-600 bg-slate-100 border-slate-200 font-medium"
          }`}
        >
          {r.fnbDiscountPercent > 0 ? `Giảm ${r.fnbDiscountPercent}%` : "Giá niêm yết (0%)"}
        </span>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Đặc quyền bổ sung</span>,
      key: "perks",
      render: (_, r) => <Text className="!text-xs !text-slate-600">{r.perks}</Text>,
    },
    {
      title: <span className="whitespace-nowrap font-bold">Thao tác</span>,
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<EditOutlined />}
          onClick={() => handleOpenEditTier(r)}
          className="!text-xs !border-slate-200 !text-slate-700 hover:!border-emerald-500 hover:!text-emerald-700 !rounded-lg whitespace-nowrap"
        >
          Chỉnh sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <CrownOutlined className="text-amber-600 text-lg" />
          <div>
            <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0 whitespace-nowrap">
              Chính Sách Tích Điểm Thăng Hạng Hội Viên
            </Title>
            <Text className="!text-xs !text-slate-500 whitespace-nowrap">
              Điểm thưởng được tự động cộng dồn khi hội viên thanh toán tại quầy POS để xét nâng hạng thẻ và hưởng quyền lợi chiết khấu
            </Text>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white rounded-2xl border border-emerald-200/90 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Định Mức Tích Lũy Điểm Thưởng Tiêu Dùng
            </span>
            <span className="text-xs text-slate-500 block max-w-xl">
              Mỗi khi hóa đơn thanh toán tiền giờ hoặc F&B hoàn tất tại quầy thu ngân POS, hệ thống sẽ tự động quy đổi số tiền chi tiêu thành điểm hội viên theo định mức này để tích lũy thăng hạng.
            </span>
            <span className="text-[11px] text-emerald-800 font-semibold pt-1 block">
              💡 <strong>Ví dụ minh họa:</strong> Hóa đơn 300.000đ sẽ tích được{" "}
              <strong className="text-emerald-950 font-bold underline">
                {Math.floor(
                  300000 / (settings.earnPointsRate > 0 ? settings.earnPointsRate : 10000),
                ).toLocaleString("vi-VN")}{" "}
                điểm
              </strong>{" "}
              thưởng thăng hạng.
            </span>
          </div>

          <div className="shrink-0 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-36">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 whitespace-nowrap">
                Số tiền chi tiêu
              </label>
              <Input
                type="number"
                min={1000}
                step={1000}
                value={settings.earnPointsRate.toString()}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    earnPointsRate: Math.max(1000, parseInt(e.target.value) || 10000),
                  })
                }
                suffix="đ"
                className="!font-bold !text-slate-800"
              />
            </div>
            <div className="text-slate-900 text-sm font-black whitespace-nowrap pt-4">
              = 1 Điểm
            </div>
          </div>
        </div>
      </div>

      {/* Member Tiers Matrix: 3 Cấp bậc chuẩn Database */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CrownOutlined className="text-purple-600 text-lg" />
            <div>
              <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0 whitespace-nowrap">
                Chính Sách Đặc Quyền 3 Cấp Bậc Hội Viên
              </Title>
              <Text className="!text-xs !text-slate-500 whitespace-nowrap">
                Đồng bộ trực tiếp với hệ thống tự động thăng hạng và chiết khấu trên hóa đơn POS
              </Text>
            </div>
          </div>
        </div>

        <Table<MemberTierPolicy>
          dataSource={settings.memberTiers}
          columns={tierColumns}
          rowKey="tierKey"
          pagination={false}
        />
      </div>

      {/* Modal: Chỉnh Sửa Chính Sách Cấp Bậc Hội Viên */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold whitespace-nowrap">
            <CrownOutlined className="text-amber-500" />
            <span>Chỉnh Sửa Chính Sách: {editingTier?.tierName}</span>
          </div>
        }
        open={isEditTierModalOpen}
        onCancel={() => {
          setIsEditTierModalOpen(false);
          setEditingTier(null);
        }}
        onOk={handleSaveTier}
        okText="Lưu chính sách"
        cancelText="Hủy bỏ"
        width={520}
        okButtonProps={{
          className: "!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !rounded-xl whitespace-nowrap",
        }}
      >
        {editingTier && (
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                Tên cấp bậc hiển thị <span className="text-rose-500">*</span>
              </label>
              <Input
                value={editingTier.tierName}
                onChange={(e) =>
                  setEditingTier({ ...editingTier, tierName: e.target.value })
                }
                placeholder="VD: Hội Viên Vàng (Gold)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                  Điểm tối thiểu
                </label>
                <Input
                  type="number"
                  min={0}
                  value={editingTier.minPoints.toString()}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      minPoints: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  suffix="điểm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                  Giảm giá tiền bàn
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingTier.tableDiscountPercent.toString()}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      tableDiscountPercent: Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                  suffix="%"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                  Giảm giá F&B
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingTier.fnbDiscountPercent.toString()}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      fnbDiscountPercent: Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                  suffix="%"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                Đặc quyền & Quyền lợi bổ sung
              </label>
              <Input.TextArea
                rows={3}
                value={editingTier.perks}
                onChange={(e) =>
                  setEditingTier({ ...editingTier, perks: e.target.value })
                }
                placeholder="VD: Giảm 15% tiền bàn, ưu tiên giữ bàn giờ cao điểm, tủ để cơ riêng"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              💡 <strong>Lưu ý nghiệp vụ:</strong> Mức giảm giá sẽ tự động được áp dụng tại máy thu ngân POS khi chọn hội viên đạt cấp bậc này và đồng bộ trên toàn hệ thống.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
