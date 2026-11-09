import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  BellOutlined,
  CrownOutlined,
  KeyOutlined,
  HistoryOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Button, Tag, Input, Typography, message, Space, Tabs } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/auth.service";
import { MemberOverviewTab, PlayHistoryTab } from "./CustomerMembershipCenter";

const { Title } = Typography;

export const CustomerProfile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [name, setName] = useState<string>(user?.name || "");
  const email = user?.email || "";
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [favoriteClub, setFavoriteClub] = useState<string>(
    "CueZone Chi Nhánh Q.3 (123 Nguyễn Thị Minh Khai)",
  );
  const [bio, setBio] = useState<string>(
    "Cơ thủ bida Bank Pool phong trào, đam mê cọ xát và học hỏi kỹ thuật gậy cơ.",
  );
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const [notifyBooking, setNotifyBooking] = useState<boolean>(true);
  const [notifyWallet, setNotifyWallet] = useState<boolean>(true);
  const [notifyTournament, setNotifyTournament] = useState<boolean>(true);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      message.warning("Vui lòng nhập họ và tên");
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      message.success("Đã cập nhật thông tin hồ sơ cá nhân thành công!");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRequestChangePassword = async () => {
    if (!currentPassword) {
      message.warning("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 8) {
      message.warning("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      message.warning("Mật khẩu mới phải chứa cả chữ cái và số");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      message.warning("Mật khẩu xác nhận không khớp");
      return;
    }
    if (currentPassword === newPassword) {
      message.warning("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    setIsChangingPassword(true);
    try {
      const resMsg = await authService.changePassword(currentPassword, newPassword);
      message.success(resMsg || "Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      message.error(err.message || "Đổi mật khẩu thất bại, vui lòng kiểm tra lại thông tin");
    } finally {
      setIsChangingPassword(false);
    }
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <Title level={2} className="!text-2xl !font-bold !text-white !mb-0">
              {name}
            </Title>
            <Tag
              color="gold"
              className="!rounded-md !px-2.5 !py-0.5 !text-xs !font-bold self-center sm:self-auto"
            >
              <CrownOutlined className="mr-1" />               HỘI VIÊN CUEZONE
            </Tag>
          </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogoutOutlined />}
              className="!border-rose-400/50 !text-rose-300 hover:!text-white hover:!bg-rose-600 hover:!border-rose-600 !rounded-xl !text-xs !font-bold self-center sm:self-auto cursor-pointer"
            >
              Đăng Xuất
            </Button>
          </div>

          <p className="text-xs text-slate-300">
            {email} • SĐT: {phone}
          </p>

          <div className="pt-2 text-xs text-slate-400">
            Thành viên CLB CueZone · Theo dõi điểm và quyền lợi trong tab Hội viên
          </div>
        </div>
      </div>

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
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Email dùng để nhận mã OTP và thông báo
                      </span>
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

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      loading={isChangingPassword}
                      onClick={handleRequestChangePassword}
                      className="!h-10 !px-5 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
                    >
                      Cập Nhật Mật Khẩu
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: "membership",
              label: (
                <Space size={6} align="center">
                  <CrownOutlined />
                  <span>Hội Viên</span>
                </Space>
              ),
              children: <MemberOverviewTab />,
            },
            {
              key: "play-history",
              label: (
                <Space size={6} align="center">
                  <HistoryOutlined />
                  <span>Lịch Sử Chơi</span>
                </Space>
              ),
              children: <PlayHistoryTab />,
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
                      <strong className="block text-sm text-slate-900 mb-0.5">
                        Nhắc nhở lịch đặt bàn
                      </strong>
                      <span className="text-slate-500">
                        Thông báo trước 30 phút khi đến giờ bàn đã giữ chỗ
                      </span>
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
                      <strong className="block text-sm text-slate-900 mb-0.5">
                        Biến động số dư ví
                      </strong>
                      <span className="text-slate-500">
                        Nhận thông báo khi nạp tiền, trừ tiền bàn và nhận hoàn tiền
                      </span>
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
                      <strong className="block text-sm text-slate-900 mb-0.5">
                        Giải đấu & Khuyến mãi
                      </strong>
                      <span className="text-slate-500">
                        Cập nhật sớm giải đấu mở rộng và ưu đãi giờ vàng
                      </span>
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

    </div>
  );
};

export default CustomerProfile;
