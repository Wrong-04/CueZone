import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrophyOutlined,
  CrownOutlined,
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  UserOutlined,
  FireOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Space, Typography, Modal } from "../../shared/ui";
import { TournamentPaymentModal } from "../../components/tournament/TournamentPaymentModal";
import { useAuth } from "../../contexts/AuthContext";
import {
  tournamentService,
  type TournamentItem as ApiTournament,
  type MyTournamentHistoryItem,
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
  registeredCount: number;
  maxPlayers: number;
  remainingSlots: number;
  feeDetail: string;
  rulesDetail: string[];
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  isFull: boolean;
  isRegistered: boolean;
}

const isPlayerConfirmed = (player: any) =>
  player &&
  player.registrationStatus !== "cancelled" &&
  (player.registrationStatus === "confirmed" || player.feePaid === true);

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
  const confirmedCount =
    typeof (item as any).registeredCount === "number"
      ? (item as any).registeredCount
      : item.players?.filter(isPlayerConfirmed).length || 0;
  const maxPlayers = item.maxPlayers || 16;
  const remainingSlots = Math.max(0, maxPlayers - confirmedCount);

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
        ? `${item.registrationFee.toLocaleString("vi-VN")} VNĐ`
        : "Miễn phí",
    feeAmount: item.registrationFee,
    prizePool: item.prizePool || "Cúp CLB + Thưởng",
    date: `${displayDate(item.startDate)} - ${displayDate(item.endDate)}`,
    participants: `${confirmedCount}/${maxPlayers} cơ thủ`,
    registeredCount: confirmedCount,
    maxPlayers,
    remainingSlots,
    feeDetail:
      item.description ||
      (item.registrationFee > 0
        ? `Lệ phí ${item.registrationFee.toLocaleString("vi-VN")}đ mỗi cơ thủ.`
        : "Giải đấu không thu lệ phí."),
    rulesDetail: item.rules
      ?.split(/\r?\n/)
      .map((rule) => rule.trim())
      .filter(Boolean) || ["Điều lệ giải đấu chuẩn WPA Bank Pool quốc tế."],
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
  const [activeMainTab, setActiveMainTab] = useState<"tournaments" | "history">("tournaments");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTournament, setSelectedTournament] = useState<TournamentItem | null>(null);

  const [myHistory, setMyHistory] = useState<MyTournamentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [registeringTourney, setRegisteringTourney] = useState<TournamentItem | null>(null);
  const openPayment = (tournament: TournamentItem) => {
    if (!user) { navigate("/login"); return; }
    setRegisteringTourney(tournament);
  };
  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    setLoadError("");
    try {
      const result = await tournamentService.getPublicTournaments();
      setTournaments(
        (result.items || []).map((item) => {
          const card = toTournamentCard(item);
          const confirmedCount =
            typeof (item as any).registeredCount === "number"
              ? (item as any).registeredCount
              : item.players?.filter(isPlayerConfirmed).length || 0;
          const isFull = confirmedCount >= item.maxPlayers;
          const isRegistered = Boolean(
            user &&
              item.players?.some(
                (player) => String(player.user) === user._id && isPlayerConfirmed(player),
              ),
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

  const loadHistory = useCallback(async () => {
    if (!user) {
      setMyHistory([]);
      return;
    }
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const data = await tournamentService.getMyHistory();
      setMyHistory(data);
    } catch (err: any) {
      setHistoryError(err?.message || "Không thể tải lịch sử tham gia giải đấu");
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (activeMainTab === "history") {
      void loadHistory();
    }
  }, [activeMainTab, loadHistory]);

  const filteredTournaments =
    filterStatus === "all"
      ? tournaments
      : tournaments.filter((tournament) => tournament.status === filterStatus);

  const wonTournamentsCount = myHistory.filter((h) => h.medal === "gold").length;

  return (
    <div className="space-y-6 pt-2 sm:pt-4">
      <div className="rounded-2xl sm:rounded-3xl bg-[#161f2c] p-2.5 sm:p-3.5 shadow-xl border border-[#29384d] relative overflow-hidden">
        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute top-1.5 left-1.5 z-20 pointer-events-none" />
        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute top-1.5 right-1.5 z-20 pointer-events-none" />
        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute bottom-1.5 left-1.5 z-20 pointer-events-none" />
        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute bottom-1.5 right-1.5 z-20 pointer-events-none" />

        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#053b2c] to-[#04281e] border border-emerald-400/25 p-5 sm:p-8 relative overflow-hidden shadow-[inset_0_2px_24px_rgba(0,0,0,0.45)]">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/35 text-amber-200 text-xs font-bold">
                <TrophyOutlined className="text-amber-300" />
                ĐẤU TRƯỜNG GIẢI ĐẤU BANK POOL CUEZONE
              </div>
              <Title
                level={1}
                className="!text-2xl sm:!text-3xl lg:!text-4xl !font-black !text-white !mb-0 tracking-tight"
              >
                Giải Đấu & Bảng Vàng Cơ Thủ
              </Title>
              <Paragraph className="!text-xs sm:!text-sm !text-emerald-100/80 !leading-relaxed !mb-0 max-w-2xl">
                Tranh tài trên mặt bàn nỉ Simonis 860 chuẩn quốc tế. Kiểm tra lệ phí, cơ cấu giải
                thưởng và ghi danh bằng chuyển khoản SePay. Suất thi đấu được chốt sau đối soát.
              </Paragraph>
            </div>

            <div className="lg:col-span-4">
              {user ? (
                <div className="rounded-2xl bg-[#091512]/90 border border-emerald-400/30 p-4 shadow-inner space-y-2.5">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <UserOutlined /> Thẻ Cơ Thủ Cá Nhân
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                      Hạng {user.rank || "K"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold text-sm block">{user.name}</span>
                      <span className="text-[11px] text-emerald-200/70 font-mono">
                        Điểm ELO: <strong className="text-amber-300 font-black">{user.elo || 1000}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        Giải Đã Tham Gia
                      </span>
                      <span className="text-sm font-mono font-black text-white">
                        {myHistory.length} Giải {wonTournamentsCount > 0 ? `• ${wonTournamentsCount} 🏆` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#091512]/90 border border-emerald-400/30 p-4 text-center space-y-2">
                  <span className="text-xs text-emerald-200/80 block">
                    Đăng nhập để xem thứ hạng ELO & thành tích cá nhân của bạn
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate("/login")}
                    className="!bg-amber-500 hover:!bg-amber-400 !border-amber-400 !text-slate-950 font-bold !rounded-xl !text-xs"
                  >
                    Đăng Nhập Ngay
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMainTab("tournaments")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === "tournaments"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrophyOutlined className={activeMainTab === "tournaments" ? "text-emerald-600" : "text-slate-400"} />
            <span>Đấu Trường Giải Đấu ({tournaments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === "history"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HistoryOutlined className={activeMainTab === "history" ? "text-emerald-600" : "text-slate-400"} />
            <span>Lịch Sử Thi Đấu Của Tôi {user && myHistory.length > 0 ? `(${myHistory.length})` : ""}</span>
          </button>
        </div>

        {activeMainTab === "tournaments" && (
          <div className="flex flex-wrap items-center gap-1">
            {[
              { key: "all", label: `Tất Cả (${tournaments.length})` },
              {
                key: "open",
                label: `Đang Mở (${tournaments.filter((t) => t.status === "open").length})`,
              },
              {
                key: "upcoming",
                label: `Giải Khác (${tournaments.filter((t) => t.status === "upcoming").length})`,
              },
              {
                key: "finished",
                label: `Đã Kết Thúc (${tournaments.filter((t) => t.status === "finished").length})`,
              },
            ].map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setFilterStatus(sub.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterStatus === sub.key
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeMainTab === "tournaments" && (
        <div className="space-y-4">
          {loadingTournaments ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="inline-block animate-spin w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full" />
              <div className="text-xs text-slate-500 font-medium">Đang đồng bộ giải đấu từ CLB CueZone...</div>
            </div>
          ) : loadError ? (
            <Card className="!rounded-2xl !border-slate-200 !p-8 !text-center">
              <p className="mb-3 text-sm text-rose-600 font-semibold">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void loadTournaments()}>
                Thử tải lại
              </Button>
            </Card>
          ) : filteredTournaments.length === 0 ? (
            <Card className="!rounded-2xl !border-slate-200 !p-12 !text-center text-sm text-slate-500">
              Hiện chưa có giải đấu nào phù hợp với bộ lọc này.
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredTournaments.map((tourney) => {
                const percent = Math.round(
                  (tourney.registeredCount / Math.max(1, tourney.maxPlayers)) * 100,
                );
                return (
                  <div
                    key={tourney.id}
                    className="rounded-2xl border-2 border-slate-800/90 bg-white hover:shadow-xl hover:border-emerald-700 transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="bg-gradient-to-r from-[#064e3b] via-[#053e30] to-[#0f172a] px-5 py-4 border-b-2 border-amber-500/30 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Tag
                              color={tourney.badgeColor}
                              className="!text-[10px] !font-bold !px-2 !py-0.5 !rounded-full uppercase !m-0"
                            >
                              {tourney.badge}
                            </Tag>
                            <span className="text-[11px] text-emerald-200 font-mono font-bold">
                              {tourney.format}
                            </span>
                          </div>
                          <Title
                            level={3}
                            className="!text-base sm:!text-lg !font-black !text-white !mb-0 leading-snug truncate"
                          >
                            {tourney.title}
                          </Title>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono text-amber-300 font-bold block">
                            Cơ cấu thưởng
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-[140px] block">
                            {tourney.prizePool}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px] font-medium">
                              Lệ phí tham gia
                            </span>
                            <strong className="text-amber-700 font-mono font-black text-sm">
                              {tourney.fee}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px] font-medium">
                              Tình trạng đăng ký
                            </span>
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {tourney.participants}
                            </span>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <CalendarOutlined className="text-emerald-700 flex-shrink-0" />
                              <span>{tourney.date}</span>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md shrink-0">
                              <TeamOutlined className="text-emerald-600" />
                              <span>Còn {tourney.remainingSlots} slot</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                            <span>Tiến độ ghi danh:</span>
                            <span className="font-mono font-bold text-slate-700">{percent}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-400"
                              style={{ width: `${Math.min(100, Math.max(percent, 0))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTournament(tourney)}
                        className="!text-xs !font-bold !border-slate-300 !text-slate-700 hover:!border-emerald-600 hover:!text-emerald-700 !rounded-xl"
                      >
                        Xem Thể Lệ & Giải Thưởng
                      </Button>

                      {tourney.isRegistered ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPayment(tourney)}
                          className="!text-xs !rounded-xl"
                        >
                          <CheckCircleOutlined /> Đã tham gia · Xem chi tiết
                        </Button>
                      ) : tourney.status === "open" && !tourney.isFull ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openPayment(tourney)}
                          className="!text-xs !font-bold !bg-[#064e3b] hover:!bg-[#047857] !border-[#064e3b] text-white !rounded-xl shadow-xs"
                        >
                          Đăng Ký Tham Gia
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          {tourney.isFull ? "Đã đủ cơ thủ" : tourney.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeMainTab === "history" && (
        <div className="space-y-5">
          {!user ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl border border-emerald-200">
                <UserOutlined />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 mb-0">
                  Đăng nhập để xem lịch sử tham gia giải đấu
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Theo dõi danh sách các giải đấu bạn đã ghi danh, kiểm tra trạng thái đóng lệ phí,
                  thứ hạng và các huy chương, thành tích đã đạt được.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate("/login")}
                rightIcon={<ArrowRightOutlined />}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
              >
                Đăng Nhập Ngay
              </Button>
            </div>
          ) : loadingHistory ? (
            <div className="py-20 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="inline-block animate-spin w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full" />
              <div>Đang tải lịch sử thi đấu của bạn...</div>
            </div>
          ) : historyError ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-600 text-sm space-y-3">
              <p>{historyError}</p>
              <Button variant="outline" size="sm" onClick={() => void loadHistory()}>
                Thử tải lại
              </Button>
            </div>
          ) : myHistory.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl border border-amber-200">
                <TrophyOutlined />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-0">
                  Bạn chưa tham gia giải đấu nào
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Đăng ký tham gia ngay các giải đấu Bank Pool đang mở để tích lũy điểm ELO, cọ xát
                  cùng các cơ thủ hàng đầu và giành cúp vô địch danh giá.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveMainTab("tournaments")}
                leftIcon={<FireOutlined />}
                className="!bg-[#064e3b] hover:!bg-[#047857] !border-[#064e3b] text-white font-bold !rounded-xl"
              >
                Khám Phá Giải Đấu Đang Mở
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-base font-black text-slate-900 mb-0">
                    Bảng Vàng Thành Tích Của Tôi ({myHistory.length} giải)
                  </h3>
                  <p className="text-xs text-slate-500 mb-0">
                    Chi tiết các giải đấu bạn đã ghi danh cùng thành tích đạt được tại CueZone
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ReloadOutlined />}
                  onClick={() => void loadHistory()}
                  className="!text-xs text-slate-600"
                >
                  Làm mới
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myHistory.map((item) => {
                  const getMedalBadge = () => {
                    if (item.medal === "gold") {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-xs">
                          <CrownOutlined /> VÔ ĐỊCH (HC VÀNG)
                        </span>
                      );
                    }
                    if (item.medal === "silver") {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900 font-bold text-xs shadow-xs">
                          <TrophyOutlined /> Á QUÂN (HC BẠC)
                        </span>
                      );
                    }
                    if (item.medal === "bronze") {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold text-xs shadow-xs">
                          <TrophyOutlined /> HẠNG 3 (HC ĐỒNG)
                        </span>
                      );
                    }
                    if (item.finalRank) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                          Top {item.finalRank}
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-xs">
                        Đã xác nhận tham gia
                      </span>
                    );
                  };

                  return (
                    <div
                      key={item.tournamentId}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {item.format} • Chạm {item.raceToScore}
                          </span>
                          <Tag
                            color={item.feePaid ? "green" : "gold"}
                            className="!rounded-md !text-[10px] !font-bold !m-0"
                          >
                            {item.feePaid ? "ĐÃ NỘP LỆ PHÍ" : "CHỜ THANH TOÁN"}
                          </Tag>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 mb-1">
                            {item.tournamentName}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            {new Date(item.startDate).toLocaleDateString("vi-VN")} -{" "}
                            {new Date(item.endDate).toLocaleDateString("vi-VN")}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Thành tích đạt được:</span>
                            <div>{getMedalBadge()}</div>
                          </div>
                          {item.prizeAmount ? (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <span className="text-slate-500">Tiền thưởng:</span>
                              <strong className="text-emerald-700 font-mono">
                                +{item.prizeAmount.toLocaleString("vi-VN")}đ
                              </strong>
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500">Lệ phí giải đấu:</span>
                            <span className="font-mono font-semibold text-slate-700">
                              {item.registrationFee > 0
                                ? `${item.registrationFee.toLocaleString("vi-VN")}đ`
                                : "Miễn phí"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>
                          Ngày ghi danh:{" "}
                          {item.registeredAt
                            ? new Date(item.registeredAt).toLocaleDateString("vi-VN")
                            : "---"}
                        </span>
                        <span className="text-emerald-700 font-bold uppercase text-[10px]">
                          {item.status === "completed"
                            ? "ĐÃ KẾT THÚC"
                            : item.status === "in_progress"
                              ? "ĐANG DIỄN RA"
                              : "SẮP KHỞI TRANH"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {registeringTourney && (
        <TournamentPaymentModal
          key={registeringTourney.id}
          tournament={{
            id: registeringTourney.id,
            title: registeringTourney.title,
            feeAmount: registeringTourney.feeAmount,
            date: registeringTourney.date,
            format: registeringTourney.format,
          }}
          onClose={() => setRegisteringTourney(null)}
          onSuccess={() => void loadTournaments()}
        />
      )}

      <Modal
        open={Boolean(selectedTournament)}
        onCancel={() => setSelectedTournament(null)}
        footer={null}
        width={560}
        title={
          <Space align="center" size={8}>
            <TrophyOutlined className="text-amber-500 text-lg" />
            <span className="text-slate-900 text-base font-bold">{selectedTournament?.title}</span>
          </Space>
        }
      >
        {selectedTournament && (
          <div className="space-y-4 py-2 text-xs text-slate-700">
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTournament(null)}
                className="!rounded-xl"
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const cur = selectedTournament;
                  setSelectedTournament(null);
                  if (cur && cur.status === "open") {
                    openPayment(cur);
                  }
                }}
                disabled={Boolean(
                  selectedTournament.status !== "open" ||
                    selectedTournament.isFull ||
                    selectedTournament.isRegistered,
                )}
                className="!bg-[#064e3b] hover:!bg-[#047857] !border-[#064e3b] text-white font-bold !rounded-xl"
              >
                Đăng Ký Tham Gia
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerTournaments;
