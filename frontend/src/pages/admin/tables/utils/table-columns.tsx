import {
  EditOutlined,
  ToolOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Button,
  Space,
  Tag,
  Tooltip,
  type TableColumnsType,
} from "../../../../shared/ui";
import type { BilliardTable } from "../../../../types";
import { getTableTypeLabel } from "../types/tables.types";

/**
 * Module tiện ích: getTableColumns
 * Chức năng: Khởi tạo định nghĩa các cột bảng danh sách bàn bida cho Ant Design Table:
 * 1. Mã & Tên Bàn: Badge mã bàn và tên bàn.
 * 2. Loại Bàn: Tag màu phân loại Pool, Carom, Snooker.
 * 3. Khu Vực & Tầng: Tag hiển thị vị trí khu vực và tầng lầu.
 * 4. Giá Giờ: Đơn giá/giờ định dạng tiền tệ vi-VN.
 * 5. Trạng Thái: Badge trạng thái (Trống, Đang chơi, Đã đặt, Bảo trì).
 * 6. Thao Tác: Các nút Sửa, Bảo trì, Xóa kèm Tooltip giải thích và disable khi bàn đang chơi.
 */
interface GetTableColumnsOptions {
  onOpenEditTable: (table: BilliardTable) => void;
  onToggleMaintenance: (table: BilliardTable) => void;
  onOpenDeleteConfirm: (table: BilliardTable) => void;
}

export function getTableColumns({
  onOpenEditTable,
  onToggleMaintenance,
  onOpenDeleteConfirm,
}: GetTableColumnsOptions): TableColumnsType<BilliardTable> {
  return [
    {
      title: <span className="whitespace-nowrap font-bold">Mã & Tên Bàn</span>,
      key: "name",
      render: (_: any, record: BilliardTable) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-slate-500 font-mono leading-none whitespace-nowrap">
              {record.code.split("-")[0]}
            </span>
            <span className="text-xs font-black text-slate-800 font-mono leading-none mt-0.5 whitespace-nowrap">
              {record.code.split("-")[1] || record.code}
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm whitespace-nowrap">{record.name}</div>
            <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
              Mã hệ thống: {record.code}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Loại Bàn</span>,
      dataIndex: "type",
      key: "type",
      render: (type: BilliardTable["type"]) => {
        const color = type === "snooker" ? "purple" : type === "carom" ? "gold" : "cyan";
        return (
          <Tag color={color} className="!rounded-full !px-2.5 !py-0.5 !font-semibold !text-xs whitespace-nowrap">
            {getTableTypeLabel(type)}
          </Tag>
        );
      },
    },
    {
      title: <span className="whitespace-nowrap font-bold">Khu Vực & Tầng</span>,
      key: "area",
      render: (_: any, record: BilliardTable) => (
        <Space size={6} wrap={false}>
          <Tag color="orange" className="!rounded-md !px-2 !py-0.5 !text-xs !font-semibold !m-0 whitespace-nowrap">
            {record.area}
          </Tag>
          <Tag color="blue" className="!rounded-md !px-2 !py-0.5 !text-xs !font-semibold !m-0 whitespace-nowrap">
            Tầng {record.floor}
          </Tag>
        </Space>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Giá Giờ</span>,
      dataIndex: "pricePerHour",
      key: "pricePerHour",
      align: "right",
      render: (price: number) => (
        <span className="font-mono font-bold text-emerald-700 text-sm whitespace-nowrap">
          {price.toLocaleString("vi-VN")}đ<span className="text-xs font-normal text-slate-400">/h</span>
        </span>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Trạng Thái</span>,
      dataIndex: "status",
      key: "status",
      render: (status: BilliardTable["status"]) => {
        if (status === "maintenance") {
          return (
            <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap">
              Bảo trì
            </Tag>
          );
        }
        if (status === "playing") {
          return (
            <Tag
              color="error"
              className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-rose-50 !text-rose-700 !border-rose-200 whitespace-nowrap"
            >
              Đang chơi
            </Tag>
          );
        }
        if (status === "paused") {
          return (
            <Tag
              color="orange"
              className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap"
            >
              Tạm dừng
            </Tag>
          );
        }
        if (status === "booked") {
          return (
            <Tag
              color="blue"
              className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-blue-50 !text-blue-700 !border-blue-200 whitespace-nowrap"
            >
              Đã đặt
            </Tag>
          );
        }
        return (
          <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap">
            Trống
          </Tag>
        );
      },
    },
    {
      title: <span className="whitespace-nowrap font-bold text-right block">Thao Tác</span>,
      key: "actions",
      align: "right",
      render: (_: any, record: BilliardTable) => {
        const isMaintenance = record.status === "maintenance";
        const isLocked =
          record.status === "playing" ||
          record.status === "paused" ||
          record.status === "booked";

        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Tooltip
              title={
                isLocked
                  ? "Bàn đang có khách chơi hoặc đã đặt trước, không thể sửa"
                  : "Sửa thông tin bàn"
              }
            >
              <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => onOpenEditTable(record)}
                  leftIcon={<EditOutlined />}
                  className={`!h-8 !px-2.5 !rounded-lg !text-xs font-medium whitespace-nowrap ${
                    isLocked
                      ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                      : "!border-slate-300 hover:!border-emerald-600"
                  }`}
                >
                  Sửa
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isMaintenance
                  ? "Mở lại bàn vào hoạt động"
                  : isLocked
                    ? "Bàn đang có khách chơi hoặc đã đặt trước, không thể chuyển bảo trì"
                    : "Chuyển bàn sang bảo trì nỉ"
              }
            >
              <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => onToggleMaintenance(record)}
                  leftIcon={<ToolOutlined />}
                  className={`!h-8 !px-2.5 !rounded-lg !text-xs font-medium whitespace-nowrap ${
                    isMaintenance
                      ? "!bg-emerald-50 !border-emerald-300 !text-emerald-800"
                      : isLocked
                        ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                        : "!border-amber-300 !bg-amber-50/60 !text-amber-800 hover:!bg-amber-100"
                  }`}
                >
                  {isMaintenance ? "Mở Lại" : "Bảo Trì"}
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isLocked
                  ? "Bàn đang có khách chơi hoặc đã đặt trước, không thể xóa"
                  : "Xóa bàn khỏi danh mục"
              }
            >
              <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    onOpenDeleteConfirm(record);
                  }}
                  leftIcon={
                    <DeleteOutlined
                      className={isLocked ? "!text-slate-400" : "text-rose-500"}
                    />
                  }
                  className={`!h-8 !px-2.5 !rounded-lg !text-xs font-medium whitespace-nowrap ${
                    isLocked
                      ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                      : "!border-slate-300 !text-rose-600 hover:!border-rose-300 hover:!bg-rose-50"
                  }`}
                >
                  Xóa
                </Button>
              </span>
            </Tooltip>
          </div>
        );
      },
    },
  ];
}
