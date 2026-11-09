import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  WalletOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Button, Tag, Input, Select, Typography, message, Space, Tabs } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/auth.service";
import { membershipService, type MembershipOverview } from "../../services/membership.service";
import { MemberOverviewTab } from "./CustomerMembershipCenter";

const { Title } = Typography;

const CLUB_BRANCHES = [
  { value: "q3", label: "CueZone Q.3 — 123 Nguyễn Thị Minh Khai, P.6, Q.3, TP.HCM" },
  { value: "q1", label: "CueZone Q.1 — 45 Lê Duẩn, P. Bến Nghé, Q.1, TP.HCM" },
  { value: "bt", label: "CueZone Bình Thạnh — 78 Điện Biên Phủ, P.25, Bình Thạnh, TP.HCM" },
];

export const CustomerProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState<string>(user?.name || "");
  const email = user?.email || "";
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [favoriteBranch, setFavoriteBranch] = useState<string>("q3");
  const [bio, setBio] = useState<string>(
    "Cơ thủ bida phong trào, đam mê cọ xát và học hỏi kỹ thuật gậy cơ tại CueZone.",
  );
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const [notifyBooking, setNotifyBooking] = useState<boolean>(true);
  const [notifyWallet, setNotifyWallet] = useState<boolean>(true);
  const [notifyTournament, setNotifyTournament] = useState<boolean>(true);

  const [overview, setOverview] = useState<MembershipOverview | null>(null);

  useEffect(() => {
    let active = true;
    membershipService
      .getOverview()
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      message.warning("Vui lòng nhập họ và tên của bạn");
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

  const handleToggleNotification = (
    type: "booking" | "wallet" | "tournament",
    nextVal: boolean,
  ) => {
    if (type === "booking") setNotifyBooking(nextVal);
    if (type === "wallet") setNotifyWallet(nextVal);
    if (type === "tournament") setNotifyTournament(nextVal);
    message.success("Đã cập nhật cài đặt thông báo!");
  };

  const memberCode = `CZ-${user?._id ? user._id.slice(-6).toUpperCase() : "MEMBER"}`;
  const tierName = overview?.currentTier?.name
    ? `HẠNG ${overview.currentTier.name.toUpperCase()}`
    : "HỘI VIÊN CHÍNH THỨC";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Thẻ Hội Viên Điện Tử (VIP Membership Card Banner) */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-9 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full opacity-10 bg-radial-gradient pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Thông tin hội viên */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 aspect-square rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-emerald-400/60 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-emerald-950/60">
                {name.charAt(0) || "U"}
              </div>
              <span className="absolute -bottom-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow">
                <CheckCircleOutlined className="text-white text-[10px] sm:text-xs" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-white !mb-0 tracking-tight">
                  {name}
                </Title>
                <Tag
                  color="gold"
                  className="!rounded-md !px-2.5 !py-0.5 !text-xs !font-bold uppercase tracking-wider shadow-xs"
                >
                  <CrownOutlined className="mr-1" />
                  {tierName}
                </Tag>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MailOutlined className="text-emerald-400" /> {email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-mono">
                  <PhoneOutlined className="text-emerald-400" /> {phone || "Chưa cập nhật SĐT"}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 pt-0.5">
                Mã hội viên: <strong className="font-mono text-emerald-400 font-bold">{memberCode}</strong> · CLB Bida CueZone
              </div>
            </div>
          </div>

          {/* Quyền lợi & Số dư ví (Bỏ nút Đăng xuất thừa thãi) */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            {overview?.currentTier && (
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-center min-w-[120px]">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Ưu Đãi Bàn / F&B</div>
                <div className="text-base font-black text-emerald-400">
                  −{overview.currentTier.tableDiscountPercent}% / −{overview.currentTier.fnbDiscountPercent}%
                </div>
              </div>
            )}

            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl px-4 py-2.5 text-center min-w-[130px]">
              <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold flex items-center justify-center gap-1">
                <TrophyOutlined /> Rank ELO
              </div>
              <div className="text-base font-black text-white font-mono">
                {user?.elo || 1000} <span className="text-xs text-amber-300 font-normal">ELO</span>
              </div>
            </div>

            <Link
              to="/customer/wallet"
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-4 py-2.5 rounded-xl transition shadow-sm h-11 shrink-0"
            >
              <WalletOutlined />
              <span>Ví Hội Viên →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Quản lý */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <Tabs
          defaultActiveKey="membership"
          className="[&_.ant-tabs-nav]:!mb-6 [&_.ant-tabs-tab]:!text-sm [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-600 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
          items={[
            {
              key: "membership",
              label: (
                <Space size={6} align="center">
                  <CrownOutlined />
                  <span>Hội Viên & Quyền Lợi</span>
                </Space>
              ),
              children: <MemberOverviewTab />,
            },
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
                      placeholder="Nhập họ và tên của bạn"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email tài khoản (Cố định):
                      </label>
                      <Input
                        value={email}
                        disabled
                        prefix={<MailOutlined className="text-slate-400 mr-1.5" />}
                        className="!h-10 !rounded-xl !bg-slate-50 text-slate-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Email dùng để nhận thông báo và hóa đơn
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Số điện thoại nhận bàn:
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        prefix={<PhoneOutlined className="text-slate-400 mr-1.5" />}
                        className="!h-10 !rounded-xl"
                        placeholder="Ví dụ: 0988123456"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Dùng để nhận bàn trực tiếp tại quầy CLB
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Chi nhánh CLB quen thuộc:
                    </label>
                    <Select
                      value={favoriteBranch}
                      onChange={setFavoriteBranch}
                      options={CLUB_BRANCHES}
                      className="w-full !h-10"
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
                      placeholder="Giới thiệu phong cách chơi bida, sở thích của bạn..."
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      loading={isSavingProfile}
                      onClick={handleSaveProfile}
                      leftIcon={<SaveOutlined />}
                      className="!h-10 !px-6 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
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
                      placeholder="Ít nhất 8 ký tự (có chữ và số)"
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
                      className="!h-10 !px-6 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
                    >
                      Cập Nhật Mật Khẩu
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
                      <strong className="block text-sm text-slate-900 mb-0.5">
                        Nhắc nhở lịch đặt bàn
                      </strong>
                      <span className="text-slate-500">
                        Nhận thông báo nhắc trước 30 phút khi đến giờ bàn đã giữ chỗ
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifyBooking}
                      onClick={() => handleToggleNotification("booking", !notifyBooking)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifyBooking ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifyBooking ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <strong className="block text-sm text-slate-900 mb-0.5">
                        Biến động số dư ví
                      </strong>
                      <span className="text-slate-500">
                        Nhận thông báo khi nạp tiền, trừ tiền thanh toán và nhận hoàn tiền
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifyWallet}
                      onClick={() => handleToggleNotification("wallet", !notifyWallet)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifyWallet ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifyWallet ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <strong className="block text-sm text-slate-900 mb-0.5">
                        Giải đấu & Ưu đãi giờ vàng
                      </strong>
                      <span className="text-slate-500">
                        Cập nhật sớm giải đấu Bank Pool mở rộng và khuyến mãi ngày hội viên
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifyTournament}
                      onClick={() => handleToggleNotification("tournament", !notifyTournament)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifyTournament ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifyTournament ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Banner liên kết sang trang Lịch sử & Hóa đơn */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg shrink-0">
            <HistoryOutlined />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Lịch Sử Cuộc Chơi & Hóa Đơn Chi Tiết</div>
            <div className="text-xs text-slate-500">
              Tra cứu nhanh toàn bộ thời gian chơi, hóa đơn tiền giờ và danh sách F&B đã thanh toán tại CLB.
            </div>
          </div>
        </div>
        <Link
          to="/customer/history"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl transition shrink-0"
        >
          Xem Lịch Sử & Hóa Đơn →
        </Link>
      </div>
    </div>
  );
};

export default CustomerProfile;
