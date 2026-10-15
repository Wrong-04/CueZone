import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Quên mật khẩu — modal 2 bước: nhập email → nhập OTP + mật khẩu mới
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const { forgotPassword, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate inline theo field (SCRUM-29)
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = "Email không được để trống";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = "Email không hợp lệ";
    }
    if (!password) {
      nextErrors.password = "Mật khẩu không được để trống";
    }
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "customer" ? "/customer" : "/admin");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgot = () => {
    setShowForgot(true);
    setForgotStep("email");
    setForgotEmail(email);
    setForgotOtp("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
  };

  const handleSendOtp = async () => {
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setForgotStep("otp");
      setForgotSuccess("Mã xác thực đã được gửi đến email của bạn");
    } catch (err: any) {
      setForgotError(err.message || "Không thể gửi mã xác thực");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotError("");
    setForgotSuccess("");
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Mật khẩu xác nhận không khớp");
      return;
    }
    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail, forgotOtp, forgotNewPassword);
      setForgotSuccess("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
      setTimeout(() => {
        setShowForgot(false);
        setEmail(forgotEmail);
        setPassword("");
      }, 1500);
    } catch (err: any) {
      setForgotError(err.message || "Đặt lại mật khẩu thất bại");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-xl mb-4">
            <span className="text-white text-2xl font-bold">CZ</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-800">Đăng nhập</h1>
          <p className="text-gray-500 mt-1">Hệ thống quản lý CueZone Billiards</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email đăng nhập</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="email@cuezone.com"
                required
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleOpenForgot}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Quên mật khẩu */}
      {showForgot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy-800">Quên mật khẩu</h2>
              <button
                onClick={() => setShowForgot(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {forgotError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 mb-4">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg border border-green-100 mb-4">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === "email" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="email@cuezone.com"
                    required
                  />
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? "Đang gửi..." : "Gửi mã xác thực"}
                </button>
              </div>
            )}

            {forgotStep === "otp" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Nhập mã xác thực (4 chữ số) đã gửi đến <span className="font-medium">{forgotEmail}</span> và mật khẩu mới.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã xác thực</label>
                  <input
                    type="text"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    maxLength={4}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-center text-lg tracking-widest"
                    placeholder="••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setForgotStep("email")}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={forgotLoading || !forgotOtp || !forgotNewPassword || !forgotConfirmPassword}
                    className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
