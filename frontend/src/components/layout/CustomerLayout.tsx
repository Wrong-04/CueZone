import React from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/customer" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CZ</span>
                </div>
                <span className="text-xl font-bold text-navy-800">CueZone</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/customer"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    location.pathname === "/customer"
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Trang chủ
                </Link>
                <Link
                  to="/customer/booking"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    location.pathname === "/customer/booking"
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Đặt bàn
                </Link>
                <Link
                  to="/customer/tournaments"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    location.pathname === "/customer/tournaments"
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Giải đấu
                </Link>
                <Link
                  to="/customer/news"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    location.pathname === "/customer/news"
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Tin tức
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link
                    to="/customer/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.name?.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-navy-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 CueZone Billiards Club. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
