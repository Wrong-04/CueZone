import React from "react";
import { useAuth } from "../../contexts/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">
          Xin chào, {user?.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">Tổng quan hoạt động hôm nay</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Bàn đang chơi", value: "6", color: "bg-red-50 text-red-600 border-red-100", icon: "🎱" },
          { label: "Bàn trống", value: "3", color: "bg-green-50 text-green-600 border-green-100", icon: "✅" },
          { label: "Doanh thu hôm nay", value: "4.2M", color: "bg-primary-50 text-primary-600 border-primary-100", icon: "💰" },
          { label: "Khách hàng", value: "24", color: "bg-blue-50 text-blue-600 border-blue-100", icon: "👥" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`p-5 rounded-xl border ${stat.color} flex items-center gap-4`}
          >
            <span className="text-3xl">{stat.icon}</span>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-navy-800 mb-4">Bàn đang hoạt động</h3>
          <div className="space-y-3">
            {[
              { code: "BÀN 01", time: "01:45:20", total: "207,500đ" },
              { code: "BÀN 02", time: "00:52:10", total: "60,000đ" },
              { code: "BÀN 04", time: "02:15:00", total: "277,500đ" },
            ].map((t) => (
              <div key={t.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="font-medium text-sm">{t.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">{t.time}</span>
                  <span className="ml-3 text-sm font-semibold text-primary-600">{t.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-navy-800 mb-4">Đặt bàn sắp tới</h3>
          <div className="space-y-3">
            {[
              { guest: "Nguyễn Văn A", table: "BÀN 05 (VIP)", time: "20:00" },
              { guest: "Trần Thị B", table: "BÀN 12", time: "21:00" },
            ].map((b, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-navy-800">{b.guest}</p>
                  <p className="text-xs text-gray-500">{b.table}</p>
                </div>
                <span className="text-sm font-semibold text-blue-600">{b.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
