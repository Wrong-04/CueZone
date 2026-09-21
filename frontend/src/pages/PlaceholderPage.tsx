import React from "react";

const PlaceholderPage = ({ title, icon }: { title: string; icon: string }) => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center">
      <span className="text-6xl">{icon}</span>
      <h2 className="mt-4 text-xl font-semibold text-navy-800">{title}</h2>
      <p className="mt-2 text-gray-500">Trang đang được xây dựng</p>
    </div>
  </div>
);

export { default as TablesPage } from "./admin/TablesManagementPage";
export const BookingPage = () => <PlaceholderPage title="Đặt bàn" icon="📅" />;
export const TournamentsPage = () => <PlaceholderPage title="Giải đấu" icon="🏆" />;
export const FnBPage = () => <PlaceholderPage title="Thực đơn F&B" icon="🍹" />;
export const InventoryPage = () => <PlaceholderPage title="Kho hàng" icon="📦" />;
export const InvoicesPage = () => <PlaceholderPage title="Hóa đơn" icon="🧾" />;
export const ReportsPage = () => <PlaceholderPage title="Báo cáo" icon="📈" />;
export { default as EmployeesPage } from "./admin/EmployeesPage";
export const NewsPage = () => <PlaceholderPage title="Tin tức" icon="📰" />;
export const SettingsPage = () => <PlaceholderPage title="Cài đặt" icon="⚙️" />;
export const CustomerBooking = () => <PlaceholderPage title="Đặt bàn" icon="📅" />;
export const CustomerTournaments = () => <PlaceholderPage title="Giải đấu" icon="🏆" />;
export const CustomerNews = () => <PlaceholderPage title="Tin tức" icon="📰" />;
