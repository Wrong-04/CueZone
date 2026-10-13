import React from "react";
import { Link } from "react-router-dom";

const CustomerHome = () => {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-900 rounded-2xl p-10 text-white">
        <h1 className="text-3xl font-bold mb-3">CueZone Billiards Club</h1>
        <p className="text-gray-300 mb-6 max-w-lg">
          Hệ thống quản lý CLB Billiards & Giải đấu Bank Pool. Đặt bàn, tham gia giải đấu và trải nghiệm dịch vụ tốt nhất.
        </p>
        <Link
          to="/customer/booking"
          className="inline-block bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          Đặt bàn ngay
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Đặt bàn Online", desc: "Chọn bàn, chọn giờ và đặt trước", icon: "🎱", link: "/customer/booking", color: "bg-primary-50 border-primary-100" },
          { title: "Giải đấu", desc: "Xem và đăng ký tham gia giải đấu", icon: "🏆", link: "/customer/tournaments", color: "bg-yellow-50 border-yellow-100" },
          { title: "Tin tức", desc: "Cập nhật tin mới nhất từ CLB", icon: "📰", link: "/customer/news", color: "bg-blue-50 border-blue-100" },
        ].map((item) => (
          <Link
            key={item.title}
            to={item.link}
            className={`p-6 rounded-xl border ${item.color} hover:shadow-md transition`}
          >
            <span className="text-4xl">{item.icon}</span>
            <h3 className="mt-4 font-semibold text-navy-800">{item.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-navy-800 mb-4">Thông tin CLB</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Địa chỉ</p>
            <p className="font-medium">123 Nguyễn Thị Minh Khai, Q.3, TP.HCM</p>
          </div>
          <div>
            <p className="text-gray-500">Hotline</p>
            <p className="font-medium">1900 6868</p>
          </div>
          <div>
            <p className="text-gray-500">Giờ hoạt động</p>
            <p className="font-medium">08:00 - 24:00 (Hàng ngày)</p>
          </div>
          <div>
            <p className="text-gray-500">Giá giờ từ</p>
            <p className="font-medium text-primary-600">50,000đ / giờ</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
