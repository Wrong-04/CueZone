import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrophyOutlined,
  CrownOutlined,
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Space, Typography, Tabs, Modal, Alert, message } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  tournamentService,
  type TournamentItem as ApiTournament,
} from "../../services/tournament.service";

const { Title, Text, Paragraph } = Typography;

interface TournamentItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  status: "open" | "upcoming" | "finished";
  format: string;
  fee: string;
  feeAmount: number;
  prizePool: string;
  date: string;
  participants: string;
  feeDetail: string;
  rulesDetail: string[];
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  isFull: boolean;
  isRegistered: boolean;
}

const toTournamentCard = (item: ApiTournament): TournamentItem => {
  const displayDate = (date: string) => new Date(date).toLocaleDateString("vi-VN");
  const statusLabels: Record<ApiTournament["status"], string> = {
    draft: "Bản nháp",
    registration_open: "Đang mở ghi danh",
    registration_closed: "Đã đóng ghi danh",
    bracket_generated: "Đã tạo nhánh đấu",
    in_progress: "Đang diễn ra",
    completed: "Đã kết thúc",
  };
  const deadlinePassed = new Date(item.registrationDeadline).getTime() < Date.now();
  const open = item.status === "registration_open" && !deadlinePassed;
  const finished = item.status === "completed";
  return {
    id: item._id,
    title: item.name,
    badge:
      deadlinePassed && item.status === "registration_open"
        ? "Hết hạn ghi danh"
        : statusLabels[item.status],
    badgeColor: open ? "green" : finished ? "default" : "gold",
    status: open ? "open" : finished ? "finished" : "upcoming",
    format: `${item.format}${item.raceToScore ? ` • Race to ${item.raceToScore}` : ""}`,
    fee:
      item.registrationFee > 0
        ? `${item.registrationFee.toLocaleString("vi-VN")} VNĐ / Cơ thủ`
        : "Miễn phí",
    feeAmount: item.registrationFee,
    prizePool: item.prizePool || "Chưa công bố",
    date: `${displayDate(item.startDate)} - ${displayDate(item.endDate)}`,
    participants: `${item.players?.length || 0}/${item.maxPlayers} cơ thủ đã ghi danh`,
    feeDetail:
      item.description ||
      (item.registrationFee > 0
        ? `Lệ phí ${item.registrationFee.toLocaleString("vi-VN")}đ mỗi cơ thủ.`
        : "Giải đấu không thu lệ phí."),
    rulesDetail: item.rules
      ?.split(/\r?\n/)
      .map((rule) => rule.trim())
      .filter(Boolean) || ["Điều lệ giải đấu chưa được cập nhật."],
    firstPrize: item.firstPrize || "Chưa công bố",
    secondPrize: item.secondPrize || "Chưa công bố",
    thirdPrize: item.thirdPrize || "Chưa công bố",
    isFull: false,
    isRegistered: false,
  };
};

const CustomerTournaments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeMainTab, setActiveMainTab] = useState<string>("tournaments");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTournament, setSelectedTournament] = useState<TournamentItem | null>(null);

  // Registration modal states
  const [registeringTourney, setRegisteringTourney] = useState<TournamentItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "counter">("wallet");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredSuccess, setRegisteredSuccess] = useState<boolean>(false);

  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    setLoadError("");
    try {
      const result = await tournamentService.getPublicTournaments();
      setTournaments(
        result.items.map((item) => {
          const card = toTournamentCard(item);
          const isFull = (item.players?.length || 0) >= item.maxPlayers;
          const isRegistered = Boolean(
            user && item.players?.some((player) => String(player.user) === user._id),
          );
          return {
            ...card,
            status: isFull && card.status === "open" ? "upcoming" : card.status,
            badge: isFull && card.status === "open" ? "Đã đủ cơ thủ" : card.badge,
            isFull,
            isRegistered,
          };
        }),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải danh sách giải đấu");
    } finally {
      setLoadingTournaments(false);
    }
  }, [user]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadTournaments(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadTournaments]);

  const filteredTournaments =
    filterStatus === "all"
      ? tournaments
      : tournaments.filter((tournament) => tournament.status === filterStatus);

  const handleConfirmRegistration = async () => {
    if (!registeringTourney) return;
    if (!user) {
      message.info("Đăng nhập để ghi danh giải đấu.");
      navigate("/login");
      return;
    }
    setIsSubmitting(true);
    try {
      await tournamentService.register(registeringTourney.id, paymentMethod);
      setRegisteredSuccess(true);
      await loadTournaments();
      message.success("Ghi danh giải đấu đã được lưu.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể ghi danh giải đấu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeRegisterModal = () => {
    setRegisteringTourney(null);
    setRegisteredSuccess(false);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <TrophyOutlined className="text-amber-600" />
            HỆ THỐNG GIẢI ĐẤU BANK POOL CUEZONE
          </div>
          <Title level={1} className="!text-3xl sm:!text-4xl !font-black !text-slate-900 !mb-0">
            Giải Đấu & Thành Tích Cơ Thủ
          </Title>
          <Paragraph className="!text-sm !text-slate-600 !leading-relaxed !mb-0">
            Xem các giải đang mở ghi danh, kiểm tra lệ phí và đăng ký bằng ví CueZone hoặc thanh
            toán tại quầy.
          </Paragraph>
        </div>
      </div>

      {/* Main Switcher: Tournaments vs Personal Achievements */}
      <div className="flex border-b border-slate-200">
        <Tabs
          activeKey={activeMainTab}
          onChange={setActiveMainTab}
          className="cuezone-main-tabs [&_.ant-tabs-tab]:!text-sm [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-700 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
          items={[
            {
              key: "tournaments",
              label: (
                <span className="flex items-center gap-2">
                  <TrophyOutlined />
                  Lịch Giải Đấu ({tournaments.length})
                </span>
              ),
            },
            {
              key: "achievements",
              label: (
                <span className="flex items-center gap-2">
                  <CrownOutlined />
                  Thành Tích & ELO Cá Nhân
                </span>
              ),
            },
          ]}
        />
      </div>

      {activeMainTab === "tournaments" && (
        <div className="space-y-8">
          {/* Sub Filter Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <Tabs
              activeKey={filterStatus}
              onChange={setFilterStatus}
              className="[&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-tab]:!text-xs [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-700 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
              items={[
                { key: "all", label: `Tất Cả (${tournaments.length})` },
                {
                  key: "open",
                  label: `Đang Mở Đăng Ký (${tournaments.filter((t) => t.status === "open").length})`,
                },
                {
                  key: "upcoming",
                  label: `Giải khác (${tournaments.filter((t) => t.status === "upcoming").length})`,
                },
                {
                  key: "finished",
                  label: `Đã Kết Thúc (${tournaments.filter((t) => t.status === "finished").length})`,
                },
              ]}
            />

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <InfoCircleOutlined className="text-emerald-600" />
              <span>Thông tin giải và lệ phí được lấy từ hệ thống.</span>
            </div>
          </div>

          {/* Cards Grid */}
          {loadingTournaments ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Đang tải danh sách giải đấu…
            </div>
          ) : loadError ? (
            <Card className="!rounded-2xl !border-slate-200 !p-8 !text-center">
              <p className="mb-3 text-sm text-rose-600">{loadError}</p>
              <Button variant="outline" onClick={() => void loadTournaments()}>
                Thử tải lại
              </Button>
            </Card>
          ) : filteredTournaments.length === 0 ? (
            <Card className="!rounded-2xl !border-slate-200 !p-8 !text-center text-sm text-slate-500">
              Hiện chưa có giải đấu phù hợp.
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredTournaments.map((tourney) => (
                <Card
                  key={tourney.id}
                  className="!rounded-2xl !border-slate-200 !bg-white hover:!shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <Tag
                        color={tourney.badgeColor}
                        className="!text-xs !font-bold !px-2.5 !py-0.5 !rounded-md uppercase"
                      >
                        {tourney.badge}
                      </Tag>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                        <TeamOutlined className="text-slate-400" />
                        {tourney.participants}
                      </span>
                    </div>

                    <div>
                      <Title
                        level={3}
                        className="!text-lg !font-bold !text-slate-900 !mb-1 leading-snug"
                      >
                        {tourney.title}
                      </Title>
                      <Text className="!text-xs !text-slate-500 block">{tourney.format}</Text>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">
                          Lệ phí thi đấu
                        </span>
                        <strong className="text-amber-700 font-bold text-sm">{tourney.fee}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">
                          Tổng giải thưởng
                        </span>
                        <strong className="text-emerald-700 font-bold text-sm">
                          {tourney.prizePool}
                        </strong>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center gap-2 text-slate-600">
                        <CalendarOutlined className="text-slate-400 flex-shrink-0" />
                        <span>Thời gian: {tourney.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTournament(tourney)}
                      className="!text-xs !font-bold !border-slate-300 !text-slate-700 hover:!border-emerald-600 hover:!text-emerald-700 !rounded-xl"
                    >
                      Xem Thể Lệ & Lệ Phí
                    </Button>

                    {tourney.isRegistered ? (
                      <Tag color="green">Đã ghi danh</Tag>
                    ) : tourney.status === "open" && !tourney.isFull ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setRegisteringTourney(tourney)}
                        className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white !rounded-xl shadow-xs"
                      >
                        Đăng Ký Tham Gia
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        {tourney.isFull ? "Đã đủ cơ thủ" : tourney.badge}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeMainTab === "achievements" && (
        <Card className="!rounded-2xl !border-slate-200 !p-8 !text-center">
          <CrownOutlined className="text-3xl text-amber-500" />
          <Title level={3} className="!mt-3 !text-lg">
            Thành tích cá nhân
          </Title>
          <Text className="!text-slate-500">
            Kết quả trận đấu và điểm ELO sẽ hiển thị khi được lưu trong hệ thống.
          </Text>
        </Card>
      )}

      <Modal
        open={Boolean(registeringTourney)}
        onCancel={closeRegisterModal}
        footer={null}
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500 text-base" />
            <span className="font-bold text-slate-900 text-sm">
              Đăng Ký Giải Đấu: {registeringTourney?.title}
            </span>
          </div>
        }
      >
        {registeringTourney && (
          <div className="space-y-4 py-2 text-xs">
            {registeredSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-xs">
                  <CheckCircleOutlined />
                </div>
                <Title level={3} className="!text-lg !font-bold !text-slate-900 !mb-0">
                  Ghi Danh Thành Công!
                </Title>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Bạn đã ghi danh giải <strong>{registeringTourney.title}</strong>.
                  {registeringTourney.feeAmount === 0
                    ? " Ghi danh không thu lệ phí."
                    : paymentMethod === "wallet"
                      ? ` ${registeringTourney.feeAmount.toLocaleString("vi-VN")}đ đã được trừ từ ví.`
                      : ` Vui lòng thanh toán ${registeringTourney.feeAmount.toLocaleString("vi-VN")}đ tại quầy.`}
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl inline-block text-left text-xs space-y-1">
                  <div>
                    Cơ thủ: <strong>{user?.name}</strong>
                  </div>
                  <div>
                    Trạng thái lệ phí:{" "}
                    <Tag
                      color={
                        registeringTourney.feeAmount === 0 || paymentMethod === "wallet"
                          ? "green"
                          : "gold"
                      }
                      className="!text-[10px]"
                    >
                      {registeringTourney.feeAmount === 0 || paymentMethod === "wallet"
                        ? "ĐÃ THANH TOÁN"
                        : "CHỜ THANH TOÁN TẠI QUẦY"}
                    </Tag>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={closeRegisterModal}
                    className="!bg-emerald-600 !border-emerald-600 !rounded-xl"
                  >
                    Đóng Cửa Sổ
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giải đấu:</span>
                    <strong className="text-slate-800 text-right">
                      {registeringTourney.title}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thời gian khởi tranh:</span>
                    <strong className="text-slate-800">{registeringTourney.date}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lệ phí gốc:</span>
                    <strong className="text-slate-800">{registeringTourney.fee}</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900">Tổng lệ phí:</span>
                    <span className="text-base font-black text-amber-700">
                      {registeringTourney.feeAmount.toLocaleString("vi-VN")} VNĐ
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block">
                    Chọn phương thức đóng lệ phí:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPaymentMethod("wallet")}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        paymentMethod === "wallet"
                          ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <WalletOutlined className="text-emerald-600" />
                        <span className="font-bold text-slate-900">Ví CueZone Pay</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        Số dư được kiểm tra khi xác nhận ghi danh.
                      </span>
                    </div>

                    <div
                      onClick={() => setPaymentMethod("counter")}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        paymentMethod === "counter"
                          ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <DollarOutlined className="text-slate-600" />
                        <span className="font-bold text-slate-900">Đóng tại quầy</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        Thanh toán trước ngày thi đấu
                      </span>
                    </div>
                  </div>
                </div>

                <Alert
                  type="info"
                  message="Thanh toán tại quầy"
                  description="Nếu chọn thanh toán tại quầy, trạng thái lệ phí sẽ chờ nhân viên xác nhận. Ghi danh hiện chưa hỗ trợ hủy trực tuyến."
                  className="!rounded-xl"
                />

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeRegisterModal}
                    className="!rounded-xl"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isSubmitting}
                    onClick={handleConfirmRegistration}
                    className="!bg-emerald-600 !border-emerald-600 !rounded-xl font-bold"
                  >
                    Xác Nhận Ghi Danh
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(selectedTournament)}
        onCancel={() => setSelectedTournament(null)}
        footer={[
          <Button
            key="close"
            variant="outline"
            onClick={() => setSelectedTournament(null)}
            className="!text-xs !rounded-xl"
          >
            Đóng
          </Button>,
          <Button
            key="register"
            variant="primary"
            onClick={() => {
              const cur = selectedTournament;
              setSelectedTournament(null);
              if (cur && cur.status === "open") {
                setRegisteringTourney(cur);
              }
            }}
            disabled={Boolean(
              selectedTournament &&
              (selectedTournament.status !== "open" ||
                selectedTournament.isFull ||
                selectedTournament.isRegistered),
            )}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Đăng Ký Tham Gia Giải Này
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <TrophyOutlined className="text-amber-500 text-lg" />
            <span className="text-slate-900 text-base font-bold">{selectedTournament?.title}</span>
          </Space>
        }
      >
        {selectedTournament && (
          <div className="space-y-5 py-2 text-xs text-slate-700">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
              <Space align="center" size={6}>
                <DollarOutlined className="text-amber-600" />
                <Text strong className="!text-xs !text-amber-900">
                  Quy Định Lệ Phí Thi Đấu: {selectedTournament.fee}
                </Text>
              </Space>
              <p className="text-slate-600 leading-relaxed mb-0">{selectedTournament.feeDetail}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <Space align="center" size={6}>
                <CrownOutlined className="text-emerald-700" />
                <Text strong className="!text-xs !text-emerald-900">
                  Cơ Cấu Giải Thưởng: {selectedTournament.prizePool}
                </Text>
              </Space>
              <ul className="space-y-1.5 text-slate-700 pl-1 mb-0">
                <li className="flex items-center gap-2">
                  <CrownOutlined className="text-amber-500" />
                  <span>
                    <strong>Giải Nhất:</strong> {selectedTournament.firstPrize}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <TrophyOutlined className="text-slate-400" />
                  <span>
                    <strong>Giải Nhì:</strong> {selectedTournament.secondPrize}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <TrophyOutlined className="text-amber-700" />
                  <span>
                    <strong>Giải Ba:</strong> {selectedTournament.thirdPrize}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <Text strong className="!text-xs !text-slate-900 block mb-2">
                Điều Lệ & Quy Định Bắt Buộc:
              </Text>
              <ul className="space-y-2 pl-1 mb-0">
                {selectedTournament.rulesDetail.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-600">
                    <CheckCircleOutlined className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerTournaments;
