import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

const CustomerProfile = () => {
  const { user, requestChangePassword, verifyChangePassword } = useAuth();

  // Đổi mật khẩu — 2 bước: nhập mật khẩu hiện tại + mới → nhập OTP
  const [step, setStep] = useState<"form" | "otp">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    setLoading(true);
    try {
      await requestChangePassword(currentPassword, newPassword);
      setStep("otp");
      setSuccess("Mã xác thực đã được gửi đến email của bạn");
    } catch (err: any) {
      setError(err.message || "Không thể gửi mã xác thực");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await verifyChangePassword(otp, newPassword);
      setSuccess("Đổi mật khẩu thành công!");
      setTimeout(() => {
        setStep("form");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setOtp("");
        setSuccess("");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Xác thực thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Hồ sơ cá nhân</h1>
        <p className="text-gray-500 mt-1">Quản lý thông tin tài khoản của bạn</p>
      </div>

      {/* Thông tin tài khoản */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-navy-800 mb-4">Thông tin tài khoản</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Họ và tên</p>
            <p className="font-medium">{user?.name || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500">Số điện thoại</p>
            <p className="font-medium">{user?.phone || "Chưa cập nhật"}</p>
          </div>
          <div>
            <p className="text-gray-500">Vai trò</p>
            <p className="font-medium capitalize">{user?.role || "—"}</p>
          </div>
        </div>
      </div>

      {/* Đổi mật khẩu */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-navy-800 mb-4">Đổi mật khẩu</h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg border border-green-100 mb-4">
            {success}
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Tối thiểu 8 ký tự, bao gồm chữ cái và số</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              onClick={handleRequestOtp}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang gửi..." : "Gửi mã xác thực"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4 max-w-md">
            <p className="text-sm text-gray-500">
              Nhập mã xác thực (4 chữ số) đã gửi đến email <span className="font-medium">{user?.email}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã xác thực</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-center text-lg tracking-widest"
                placeholder="••••"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("form")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition"
              >
                Quay lại
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={loading || !otp}
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
