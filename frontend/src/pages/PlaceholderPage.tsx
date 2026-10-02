import type { ReactNode } from "react";
import {
  FileTextOutlined,
  LineChartOutlined,
  ReadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Typography } from "../shared/ui";

const { Title, Text } = Typography;

const PlaceholderPage = ({ title, icon }: { title: string; icon: ReactNode }) => (
  <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center">
    <div className="text-4xl text-emerald-400 mb-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 inline-flex items-center justify-center">
      {icon}
    </div>
    <Title level={3} className="!text-lg !font-bold !text-white !mb-1">
      {title}
    </Title>
    <Text className="!text-xs !text-slate-400">Trang đang được xây dựng</Text>
  </div>
);

export { default as TablesPage } from "./admin/TablesManagementPage";
export { default as BookingPage } from "./admin/BookingManagementPage";
export { default as TournamentsPage } from "./admin/AdminTournamentsPage";
export { default as FnBPage } from "./admin/FnBInventoryPage";
export { default as InventoryPage } from "./admin/WarehouseInventoryPage";
export const InvoicesPage = () => <PlaceholderPage title="Hóa đơn" icon={<FileTextOutlined />} />;
export const ReportsPage = () => <PlaceholderPage title="Báo cáo" icon={<LineChartOutlined />} />;
export { default as EmployeesPage } from "./admin/EmployeesPage";
export const NewsPage = () => <PlaceholderPage title="Tin tức" icon={<ReadOutlined />} />;
export const SettingsPage = () => <PlaceholderPage title="Cài đặt" icon={<SettingOutlined />} />;
