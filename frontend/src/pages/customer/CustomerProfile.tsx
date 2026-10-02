import React, { useState } from "react";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  BellOutlined,
  CrownOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Input,
  Typography,
  message,
  Space,
  Modal,
  Tabs,
} from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";

const { Title } = Typography;

export const CustomerProfile: React.FC = () => {
  const { user } = useAuth();

  // Thông tin cá nhân
  const [name, setName] = useState<string>(user?.name || "Đặng Tuấn Anh");
  const email = user?.email || "customer@cuezone.com";
  const [phone, setPhone] = useState<string>(user?.phone || "0912 345 678");
  const [favoriteClub, setFavoriteClub] = useState<string>("CueZone Chi Nhánh Q.3 (123 Nguyễn Thị Minh Khai)");
  const [bio, setBio] = useState<string>("Cơ thủ bida Bank Pool phong trào, đam mê cọ xát và học hỏi kỹ thuật gậy cơ.");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [otpStep, setOtpStep] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");

  // Cài đặt thông báo
  const [notifyBooking, setNotifyBooking] = useState<boolean>(true);
  const [notifyWallet, setNotifyWallet] = useState<boolean>(true);
  const [notifyTournament, setNotifyTournament] = useState<boolean>(true);

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    setTimeout(() => {
      setIsSavingProfile(false);
      message.success("Đã cập nhật thông tin hồ sơ cá nhân thành công!");
    }, 700);
  };

  const handleRequestChangePassword = () => {
    if (!currentPassword) {
      message.warning("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 8) {
      message.warning("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      message.warning("Mật khẩu xác nhận không khớp");
      return;
    }

    setOtpStep(true);
    message.info(`Đã gửi mã xác thực OTP 4 chữ số đến email: ${email}`);
  };

  const handleConfirmOtpChangePassword = () => {
    if (otpCode.length < 4) {
      message.warning("Vui lòng nhập đủ 4 chữ số mã OTP");
      return;
    }
    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setOtpStep(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setOtpCode("");
      message.success("Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.");
    }, 800);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Profile Card */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white p-8 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-emerald-600 border-2 border-emerald-400/50 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-emerald-900/50">
            {name.charAt(0) || "U"}
          </div>
          <span className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
            <CheckCircleOutlined className="text-white text-[10px]" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <Title level={2} className="!text-2xl !font-bold !text-white !mb-0">
              {name}
            </Title>
            <Tag color="gold" className="!rounded-md !px-2.5 !py-0.5 !text-xs !font-bold self-center sm:self-auto">
              <CrownOutlined className="mr-1" /> DIAMOND VIP
            </Tag>
          </div>

          <p className="text-xs text-slate-300">
            {email} • SĐT: {phone}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
            <span>Hạng ELO: <strong className="text-amber-400">Master 1850</strong></span>
            <span>•</span>
            <span>Tỉ lệ thắng: <strong className="text-emerald-400">68%</strong></span>
            <span>•</span>
            <span>Hội viên từ: <strong>01/2026</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs Quản Lý: Hồ Sơ Cá Nhân vs Đổi Mật Khẩu vs Cài Đặt Thông Báo */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <Tabs
          defaultActiveKey="profile"
          className="[&_.ant-tabs-nav]:!mb-6 [&_.ant-tabs-tab]:!text-sm [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-600 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
          items={[
            {
              key: "profile",
              label: (
                <Space size={6} align="center">
                  <UserOutlined />
                  <span>Hồ Sơ Cá Nhân</span>
                </Space>
              ),
              children: (
                <div className="space-y-5 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Họ và tên cơ thủ:
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      prefix={<UserOutlined className="text-slate-400 mr-1.5" />}
                      className="!h-10 !rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email đăng nhập:
                      </label>
                      <Input
                        value={email}
                        disabled
                        prefix={<MailOutlined className="text-slate-400 mr-1.5" />}
                        className="!h-10 !rounded-xl !bg-slate-50"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Email dùng để nhận mã OTP và thông báo</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Số điện thoại:
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        prefix={<PhoneOutlined className="text-slate-400 mr-1.5" />}
                        className="!h-10 !rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Chi nhánh CLB quen thuộc:
                    </label>
                    <Input
                      value={favoriteClub}
                      onChange={(e) => setFavoriteClub(e.target.value)}
                      className="!h-10 !rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Giới thiệu ngắn (Bio cơ thủ):
                    </label>
                    <Input.TextArea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="!rounded-xl"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      loading={isSavingProfile}
                      onClick={handleSaveProfile}
                      leftIcon={<SaveOutlined />}
                      className="!h-10 !px-5 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
                    >
                      Lưu Thay Đổi
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: "security",
              label: (
                <Space size={6} align="center">
                  <KeyOutlined />
                  <span>Đổi Mật Khẩu</span>
                </Space>
              ),
              children: (
                <div className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu hiện tại:
                    </label>
                    <Input.Password
                      placeholder="Nhập mật khẩu đang dùng"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      prefix={<LockOutlined className="text-slate-400 mr-1.5" />}
                      className="!h-10 !rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu mới:
                    </label>
                    <Input.Password
                      placeholder="Ít nhất 8 ký tự"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      prefix={<LockOutlined className="text-slate-400 mr-1.5" />}
                      className="!h-10 !rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Xác nhận mật khẩu mới:
                    </label>
                    <Input.Password
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      prefix={<LockOutlined className="text-slate-400 mr-1.5" />}
                      className="!h-10 !rounded-xl"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    <SafetyCertificateOutlined className="text-emerald-600 mr-1.5" />
                    Để bảo vệ tài khoản, sau khi nhấn tiếp tục hệ thống sẽ gửi mã OTP 4 số về email của bạn để xác thực.
                  </div>

                  <div className="pt-1">
                    <Button
                      variant="primary"
                      onClick={handleRequestChangePassword}
                      className="!h-10 !px-5 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
                    >
                      Xác Nhận & Nhận Mã OTP
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: "notifications",
              label: (
                <Space size={6} align="center">
                  <BellOutlined />
                  <span>Cài Đặt Thông Báo</span>
                </Space>
              ),
              children: (
                <div className="space-y-4 max-w-xl text-xs text-slate-700">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <strong className="block text-sm text-slate-900 mb-0.5">Nhắc nhở lịch đặt bàn</strong>
                      <span className="text-slate-500">Thông báo trước 30 phút khi đến giờ bàn đã giữ chỗ</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyBooking}
                      onChange={(e) => setNotifyBooking(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <strong className="block text-sm text-slate-900 mb-0.5">Biến động số dư ví</strong>
                      <span className="text-slate-500">Nhận thông báo khi nạp tiền, trừ tiền bàn và nhận hoàn tiền</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyWallet}
                      onChange={(e) => setNotifyWallet(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <strong className="block text-sm text-slate-900 mb-0.5">Giải đấu & Khuyến mãi</strong>
                      <span className="text-slate-500">Cập nhật sớm giải đấu mở rộng và ưu đãi giờ vàng</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyTournament}
                      onChange={(e) => setNotifyTournament(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* MODAL XÁC NHẬN OTP ĐỔI MẬT KHẨU */}
      <Modal
        open={otpStep}
        onCancel={() => setOtpStep(false)}
        footer={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => setOtpStep(false)}
            className="!text-xs !rounded-xl"
          >
            Hủy Bỏ
          </Button>,
          <Button
            key="confirm"
            variant="primary"
            loading={isChangingPassword}
            onClick={handleConfirmOtpChangePassword}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Xác Thực & Đổi Mật Khẩu
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <SafetyCertificateOutlined className="text-emerald-600 text-lg" />
            <span className="text-slate-900 font-bold">Xác Thực OTP Đổi Mật Khẩu</span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <p>
            Vui lòng nhập mã OTP 4 chữ số được gửi tới hộp thư: <strong>{email}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mã xác thực (OTP):
            </label>
            <Input
              maxLength={4}
              placeholder="Nhập 4 số OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="!h-11 !text-center !text-lg !font-bold !tracking-widest !rounded-xl"
            />
          </div>

          <p className="text-slate-400 text-[11px]">
            Không nhận được mã? Bạn có thể gửi lại mã sau 60 giây.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerProfile;
