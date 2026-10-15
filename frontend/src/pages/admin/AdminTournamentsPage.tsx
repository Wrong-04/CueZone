import React, { useState, useEffect, useMemo } from "react";
import {
  TrophyOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  SwapOutlined,
  VideoCameraOutlined,
  TeamOutlined,
  SearchOutlined,
  CrownOutlined,
  FilterOutlined,
  CalendarOutlined,
  FireOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Typography,
  message,
  Modal,
  Table,
  Input,
  Select,
  SegmentedPillList,
  Card,
  type TableColumnsType,
} from "../../shared/ui";
import {
  INITIAL_TOURNAMENT_MATCH,
  type TournamentMatchScore,
} from "../../mock/posData";

const { Title, Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TournamentAdminItem {
  id: string;
  title: string;
  status: "open" | "in_progress" | "upcoming" | "finished";
  statusText: string;
  format: string;
  raceTo: number;
  feeAmount: number;
  feeFormatted: string;
  prizePool: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  date: string;
  registeredCount: number;
  maxParticipants: number;
  assignedTables: string[];
}

export interface PlayerRankItem {
  id: string;
  rankIndex: number;
  name: string;
  avatar: string;
  tier: "Grand Master" | "Master" | "Senior" | "Pro";
  elo: number;
  matchesPlayed: number;
  winRate: number;
  tournamentsWon: number;
  status: "active" | "inactive";
}

// ── Seed Mock Data ────────────────────────────────────────────────────────────

const INITIAL_TOURNAMENTS: TournamentAdminItem[] = [
  {
    id: "tourney-1",
    title: "CueZone Bank Pool Open Championship Q2/2026",
    status: "in_progress",
    statusText: "Đang Diễn Ra (Vòng Bán Kết)",
    format: "Loại trực tiếp (Single Elimination) • Race to 5",
    raceTo: 5,
    feeAmount: 200000,
    feeFormatted: "200.000đ",
    prizePool: "15.000.000đ + Cúp Vàng",
    firstPrize: "8.000.000đ + Cúp",
    secondPrize: "4.000.000đ + HCB",
    thirdPrize: "1.500.000đ x 2",
    date: "15/10/2026 - 18/10/2026",
    registeredCount: 32,
    maxParticipants: 32,
    assignedTables: ["Bàn Match 13 (VAR)", "Bàn Match 14 (VAR)"],
  },
  {
    id: "tourney-2",
    title: "Bank Pool Weekend Challenge - Tranh Tài Tuần #43",
    status: "open",
    statusText: "Đang Mở Đăng Ký",
    format: "Vòng tròn tính điểm & Knock-out • Race to 4",
    raceTo: 4,
    feeAmount: 100000,
    feeFormatted: "100.000đ",
    prizePool: "5.000.000đ + ELO CLB",
    firstPrize: "2.500.000đ + HCV",
    secondPrize: "1.500.000đ + HCB",
    thirdPrize: "500.000đ (Đồng hạng 3)",
    date: "Chủ Nhật hàng tuần (14:00 - 19:00)",
    registeredCount: 12,
    maxParticipants: 16,
    assignedTables: ["Bàn VIP 10", "Bàn VIP 11"],
  },
  {
    id: "tourney-3",
    title: "Giải Bida Bank Pool Trẻ CueZone Junior Cup Q3",
    status: "upcoming",
    statusText: "Sắp Khởi Tranh",
    format: "Loại trực tiếp • Race to 3",
    raceTo: 3,
    feeAmount: 50000,
    feeFormatted: "50.000đ",
    prizePool: "3.000.000đ + Cơ Bida Custom",
    firstPrize: "1.500.000đ + 01 Cơ Bida CueZone",
    secondPrize: "1.000.000đ + Voucher",
    thirdPrize: "500.000đ",
    date: "05/11/2026 - 06/11/2026",
    registeredCount: 8,
    maxParticipants: 16,
    assignedTables: ["Bàn 01", "Bàn 02"],
  },
  {
    id: "tourney-4",
    title: "CueZone Master Invitational Season 1",
    status: "finished",
    statusText: "Đã Bế Mạc & Trao Cúp",
    format: "Vòng chung kết 8 cơ thủ xuất sắc • Race to 7",
    raceTo: 7,
    feeAmount: 0,
    feeFormatted: "Miễn phí (Thư mời)",
    prizePool: "20.000.000đ",
    firstPrize: "Quán Quân: Nguyễn Hoàng Nam (10.000.000đ)",
    secondPrize: "Á Quân: Lê Quốc Bảo (6.000.000đ)",
    thirdPrize: "Hạng Ba: Trần Đình Trọng (4.000.000đ)",
    date: "10/09/2026 - 12/09/2026",
    registeredCount: 8,
    maxParticipants: 8,
    assignedTables: ["Bàn Match 13 (VAR)"],
  },
];

const SECOND_MATCH: TournamentMatchScore = {
  matchId: "MATCH-BP-02",
  tournamentName: "Bank Pool Weekend Challenge #43 - Vòng Bán Kết 2",
  tableId: "TB-14",
  tableName: "Bàn Match 14 (K-Steel VAR)",
  refereeName: "Nguyễn Hải Long (Trọng tài CLB)",
  raceTo: 5,
  currentRack: 5,
  activePlayerTurn: 2,
  player1: {
    id: "P3",
    name: "Lê Quốc Bảo",
    rank: "Master",
    elo: 1880,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    score: 3,
    fouls: 1,
    bankShots: 13,
  },
  player2: {
    id: "P4",
    name: "Nguyễn Hoàng Nam",
    rank: "Grand Master",
    elo: 1940,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    score: 4,
    fouls: 0,
    bankShots: 16,
  },
  status: "in_progress",
};

const LEADERBOARD_DATA: PlayerRankItem[] = [
  {
    id: "pl-1",
    rankIndex: 1,
    name: "Nguyễn Hoàng Nam",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    tier: "Grand Master",
    elo: 1940,
    matchesPlayed: 48,
    winRate: 85.4,
    tournamentsWon: 5,
    status: "active",
  },
  {
    id: "pl-2",
    rankIndex: 2,
    name: "Lê Quốc Bảo",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    tier: "Master",
    elo: 1880,
    matchesPlayed: 42,
    winRate: 78.5,
    tournamentsWon: 3,
    status: "active",
  },
  {
    id: "pl-3",
    rankIndex: 3,
    name: "Đặng Tuấn Anh",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
    tier: "Master",
    elo: 1850,
    matchesPlayed: 36,
    winRate: 72.2,
    tournamentsWon: 2,
    status: "active",
  },
  {
    id: "pl-4",
    rankIndex: 4,
    name: "Trần Minh Quang",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    tier: "Senior",
    elo: 1820,
    matchesPlayed: 30,
    winRate: 66.7,
    tournamentsWon: 1,
    status: "active",
  },
  {
    id: "pl-5",
    rankIndex: 5,
    name: "Vũ Hải Đăng",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
    tier: "Senior",
    elo: 1780,
    matchesPlayed: 25,
    winRate: 64.0,
    tournamentsWon: 1,
    status: "active",
  },
  {
    id: "pl-6",
    rankIndex: 6,
    name: "Trần Đình Trọng",
    avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=150&q=80",
    tier: "Pro",
    elo: 1750,
    matchesPlayed: 22,
    winRate: 59.1,
    tournamentsWon: 0,
    status: "active",
  },
];

export const AdminTournamentsPage: React.FC = () => {
  // ── 1. ACTIVE MAIN TAB ────────────────────────────────────────────────────
  const [activeMainTab, setActiveMainTab] = useState<string>("tournaments");

  // ── 2. TOURNAMENTS STATE ──────────────────────────────────────────────────
  const [tournamentsList, setTournamentsList] = useState<TournamentAdminItem[]>(() => {
    const saved = localStorage.getItem("cuezone_admin_tournaments");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TOURNAMENTS;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_admin_tournaments", JSON.stringify(tournamentsList));
  }, [tournamentsList]);

  // Tournament Filters
  const [tourneyFilter, setTourneyFilter] = useState<string>("all");
  const [tourneySearchQuery, setTourneySearchQuery] = useState<string>("");

  // ── 3. LIVE REFEREE SCORING STATE ─────────────────────────────────────────
  const [currentMatchId, setCurrentMatchId] = useState<string>("MATCH-BP-01");
  const [matchDataMap, setMatchDataMap] = useState<Record<string, TournamentMatchScore>>(() => {
    const saved = localStorage.getItem("cuezone_matches_map");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      "MATCH-BP-01": INITIAL_TOURNAMENT_MATCH,
      "MATCH-BP-02": SECOND_MATCH,
    };
  });

  useEffect(() => {
    localStorage.setItem("cuezone_matches_map", JSON.stringify(matchDataMap));
  }, [matchDataMap]);

  const activeMatch = matchDataMap[currentMatchId] || INITIAL_TOURNAMENT_MATCH;

  // Shot-Clock 40s Timer
  const [shotClockSeconds, setShotClockSeconds] = useState<number>(40);
  const [isShotClockRunning, setIsShotClockRunning] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isShotClockRunning && shotClockSeconds > 0) {
      timer = setInterval(() => {
        setShotClockSeconds((prev) => prev - 1);
      }, 1000);
    } else if (shotClockSeconds === 0 && isShotClockRunning) {
      message.error("Hết giờ Shot-Clock 40 giây! Chuyển lượt đánh hoặc tính lỗi quá giờ.");
      setIsShotClockRunning(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isShotClockRunning, shotClockSeconds]);

  const handleStartShotClock = () => {
    setIsShotClockRunning(true);
  };

  const handlePauseShotClock = () => {
    setIsShotClockRunning(false);
  };

  const handleResetShotClock = () => {
    setShotClockSeconds(40);
    setIsShotClockRunning(false);
  };

  const handleTimeOut30s = () => {
    setShotClockSeconds((prev) => prev + 30);
    message.info("Đã cộng thêm 30 giây hội ý (Time-out) cho cơ thủ!");
  };

  // VAR Review Trigger
  const [varModalVisible, setVarModalVisible] = useState<boolean>(false);
  const handleTriggerVarReview = () => {
    setVarModalVisible(true);
  };

  // Match Scoring handlers
  const handleScoreRackPoint = (playerIndex: 1 | 2) => {
    if (activeMatch.status === "finished") {
      message.warning("Trận đấu này đã kết thúc!");
      return;
    }

    setMatchDataMap((prev) => {
      const match = { ...prev[currentMatchId] };
      if (playerIndex === 1) {
        const nextScore = match.player1.score + 1;
        match.player1 = {
          ...match.player1,
          score: nextScore,
          bankShots: match.player1.bankShots + 1,
        };
        if (nextScore >= match.raceTo) {
          match.status = "finished";
          match.winnerId = match.player1.id;
          setWinnerId(match.player1.id);
          setFinishModalVisible(true);
        }
      } else {
        const nextScore = match.player2.score + 1;
        match.player2 = {
          ...match.player2,
          score: nextScore,
          bankShots: match.player2.bankShots + 1,
        };
        if (nextScore >= match.raceTo) {
          match.status = "finished";
          match.winnerId = match.player2.id;
          setWinnerId(match.player2.id);
          setFinishModalVisible(true);
        }
      }
      return { ...prev, [currentMatchId]: match };
    });

    handleResetShotClock();
    const playerName = playerIndex === 1 ? activeMatch.player1.name : activeMatch.player2.name;
    message.success(`+1 Ván thắng (Rack) cho cơ thủ ${playerName}!`);
  };

  const handleFoul = (playerIndex: 1 | 2) => {
    if (activeMatch.status === "finished") return;

    setMatchDataMap((prev) => {
      const match = { ...prev[currentMatchId] };
      if (playerIndex === 1) {
        match.player1 = { ...match.player1, fouls: match.player1.fouls + 1 };
      } else {
        match.player2 = { ...match.player2, fouls: match.player2.fouls + 1 };
      }
      // Switch turn
      match.activePlayerTurn = playerIndex === 1 ? 2 : 1;
      return { ...prev, [currentMatchId]: match };
    });

    handleResetShotClock();
    const playerName = playerIndex === 1 ? activeMatch.player1.name : activeMatch.player2.name;
    message.warning(`Ghi nhận phạm quy (Foul) cho ${playerName} • Chuyển bi trong tay!`);
  };

  const handleBankShotCount = (playerIndex: 1 | 2) => {
    setMatchDataMap((prev) => {
      const match = { ...prev[currentMatchId] };
      if (playerIndex === 1) {
        match.player1 = { ...match.player1, bankShots: match.player1.bankShots + 1 };
      } else {
        match.player2 = { ...match.player2, bankShots: match.player2.bankShots + 1 };
      }
      return { ...prev, [currentMatchId]: match };
    });
    message.success("+1 Bi ăn băng hợp lệ!");
  };

  const handleSwitchTurn = () => {
    setMatchDataMap((prev) => {
      const match = { ...prev[currentMatchId] };
      match.activePlayerTurn = match.activePlayerTurn === 1 ? 2 : 1;
      return { ...prev, [currentMatchId]: match };
    });
    handleResetShotClock();
    message.info("Đã chuyển quyền đánh cho cơ thủ đối thủ!");
  };

  const handleResetMatch = () => {
    setMatchDataMap((prev) => ({
      ...prev,
      [currentMatchId]: {
        ...prev[currentMatchId],
        currentRack: 1,
        player1: { ...prev[currentMatchId].player1, score: 0, fouls: 0, bankShots: 0 },
        player2: { ...prev[currentMatchId].player2, score: 0, fouls: 0, bankShots: 0 },
        status: "in_progress",
        winnerId: undefined,
      },
    }));
    handleResetShotClock();
    message.info("Đã thiết lập lại tỉ số trận đấu về 0 - 0!");
  };

  // ── 4. MODALS ─────────────────────────────────────────────────────────────
  // Modal: Create Tournament
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newTourneyForm, setNewTourneyForm] = useState({
    title: "",
    raceTo: 5,
    feeAmount: 150000,
    prizePool: "10.000.000đ + Cúp Vàng",
    firstPrize: "5.000.000đ",
    secondPrize: "3.000.000đ",
    thirdPrize: "1.000.000đ x 2",
    date: "25/10/2026 - 28/10/2026",
    maxParticipants: 16,
    assignedTables: "Bàn Match 13, Bàn Match 14",
  });

  const handleSaveNewTournament = () => {
    if (!newTourneyForm.title.trim()) {
      message.warning("Vui lòng nhập tên giải đấu!");
      return;
    }

    const created: TournamentAdminItem = {
      id: `tourney-${Date.now()}`,
      title: newTourneyForm.title.trim(),
      status: "open",
      statusText: "Đang Mở Đăng Ký",
      format: `Loại trực tiếp • Race to ${newTourneyForm.raceTo}`,
      raceTo: Number(newTourneyForm.raceTo) || 5,
      feeAmount: Number(newTourneyForm.feeAmount) || 0,
      feeFormatted: `${Number(newTourneyForm.feeAmount).toLocaleString("vi-VN")}đ`,
      prizePool: newTourneyForm.prizePool,
      firstPrize: newTourneyForm.firstPrize,
      secondPrize: newTourneyForm.secondPrize,
      thirdPrize: newTourneyForm.thirdPrize,
      date: newTourneyForm.date,
      registeredCount: 0,
      maxParticipants: Number(newTourneyForm.maxParticipants) || 16,
      assignedTables: newTourneyForm.assignedTables.split(",").map((s) => s.trim()),
    };

    setTournamentsList((prev) => [created, ...prev]);
    message.success(`Đã tạo thành công giải đấu "${created.title}"!`);
    setCreateModalVisible(false);
  };

  // Modal: Participants Approval
  const [participantsModalVisible, setParticipantsModalVisible] = useState<boolean>(false);
  const [selectedTourneyForParticipants, setSelectedTourneyForParticipants] =
    useState<TournamentAdminItem | null>(null);

  const handleOpenParticipants = (tourney: TournamentAdminItem) => {
    setSelectedTourneyForParticipants(tourney);
    setParticipantsModalVisible(true);
  };

  // Modal: Match Finish & ELO Sync
  const [finishModalVisible, setFinishModalVisible] = useState<boolean>(false);
  const [winnerId, setWinnerId] = useState<string>("");

  // ── 5. FILTERED TOURNAMENTS ───────────────────────────────────────────────
  const filteredTournaments = useMemo(() => {
    return tournamentsList.filter((item) => {
      const matchStatus = tourneyFilter === "all" || item.status === tourneyFilter;
      const q = tourneySearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [tournamentsList, tourneyFilter, tourneySearchQuery]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const totalTourneys = tournamentsList.length;
    const activeCount = tournamentsList.filter(
      (t) => t.status === "open" || t.status === "in_progress"
    ).length;
    const totalRegistered = tournamentsList.reduce(
      (acc, cur) => acc + cur.registeredCount,
      0
    );
    const liveMatches = 2;
    return { totalTourneys, activeCount, totalRegistered, liveMatches };
  }, [tournamentsList]);

  // Main Tabs navigation pills
  const mainTabPills = [
    {
      key: "tournaments",
      label: "Danh Sách Giải Đấu",
      badge: tournamentsList.length,
    },
    {
      key: "referee_live",
      label: "Bảng Điểm Trọng Tài Điện Tử",
      badge: "LIVE VAR",
      dotClassName: "bg-rose-500 animate-ping",
    },
    {
      key: "brackets",
      label: "Sơ Đồ Nhánh Đấu (Bracket Tree)",
      badge: "Vòng Bán Kết",
    },
    {
      key: "leaderboard",
      label: "Bảng Xếp Hạng ELO Cơ Thủ",
      badge: LEADERBOARD_DATA.length,
    },
  ];

  // Leaderboard Columns
  const leaderboardColumns: TableColumnsType<PlayerRankItem> = [
    {
      title: "Hạng",
      dataIndex: "rankIndex",
      key: "rankIndex",
      width: 75,
      align: "center",
      render: (rank: number) => {
        if (rank === 1)
          return (
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black text-sm flex items-center justify-center mx-auto border border-amber-300 shadow-xs">
              <CrownOutlined />
            </div>
          );
        if (rank === 2)
          return (
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center mx-auto border border-slate-300 shadow-xs">
              2
            </div>
          );
        if (rank === 3)
          return (
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-800 font-black text-sm flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
              3
            </div>
          );
        return <span className="font-bold text-slate-500">{rank}</span>;
      },
    },
    {
      title: "Cơ Thủ",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: PlayerRankItem) => (
        <div className="flex items-center gap-3">
          <img
            src={record.avatar}
            alt={name}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
          />
          <div>
            <span className="font-bold text-slate-900 text-sm block">{name}</span>
            <Tag color={record.tier === "Grand Master" ? "gold" : record.tier === "Master" ? "green" : "blue"} className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold">
              {record.tier}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Điểm ELO",
      dataIndex: "elo",
      key: "elo",
      width: 120,
      render: (elo: number) => (
        <span className="font-mono font-black text-emerald-700 text-base">
          {elo}
        </span>
      ),
    },
    {
      title: "Trận Đấu",
      dataIndex: "matchesPlayed",
      key: "matchesPlayed",
      width: 110,
      align: "center",
      render: (m: number) => <span className="font-semibold text-slate-700">{m} trận</span>,
    },
    {
      title: "Tỉ Lệ Thắng",
      dataIndex: "winRate",
      key: "winRate",
      width: 120,
      align: "center",
      render: (wr: number) => (
        <span className="font-bold text-slate-900 font-mono">{wr}%</span>
      ),
    },
    {
      title: "Cúp Vô Địch",
      dataIndex: "tournamentsWon",
      key: "tournamentsWon",
      width: 120,
      align: "center",
      render: (won: number) => (
        <div className="flex items-center justify-center gap-1 text-amber-500 font-bold">
          <TrophyOutlined />
          <span>{won}</span>
        </div>
      ),
    },
  ];

  const isPlayer1Active = activeMatch.activePlayerTurn === 1;
  const isPlayer2Active = activeMatch.activePlayerTurn === 2;

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER & KPI CARDS ────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-50 via-emerald-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <TrophyOutlined className="text-xl" />
              </div>
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Quản Lý Giải Đấu & Trọng Tài Bank Pool
              </Title>
              <Tag color="gold" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                WPA & BCA TOURNAMENT HUB
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Điều hành các giải đấu bida chuyên nghiệp, phân nhánh đấu (Brackets), duyệt cơ thủ đăng ký và điều khiển bảng điểm điện tử VAR trực tiếp.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ThunderboltOutlined />}
              onClick={() => setActiveMainTab("referee_live")}
              className="!rounded-xl !text-xs font-bold !text-slate-700"
            >
              Vào Bảng Điểm Live
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Tạo Giải Đấu Mới
            </Button>
          </div>
        </div>

        {/* Counter KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Tổng số giải đấu
              </span>
              <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs border border-slate-200">
                <CalendarOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalTourneys}
              </span>
              <span className="text-xs font-semibold text-slate-500">giải trong mùa</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                Đang mở / Diễn ra
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs border border-emerald-200">
                <FireOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
                {metrics.activeCount}
              </span>
              <span className="text-xs font-semibold text-emerald-700">giải hoạt động</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                Cơ thủ đã ghi danh
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs border border-blue-200">
                <TeamOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-blue-800 tracking-tight">
                {metrics.totalRegistered}
              </span>
              <span className="text-xs font-semibold text-blue-700">vận động viên</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-rose-800 font-semibold uppercase tracking-wider">
                Bàn thi đấu Live VAR
              </span>
              <span className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 text-xs border border-rose-200">
                <VideoCameraOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-rose-800 tracking-tight">
                Bàn 13 & 14
              </span>
              <span className="text-xs font-semibold text-rose-700">Đang chấm điểm</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TABS SWITCHER ────────────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
        <SegmentedPillList
          items={mainTabPills}
          activeKey={activeMainTab}
          onSelect={(key) => setActiveMainTab(key)}
        />
      </div>

      {/* ── TAB 1: DANH SÁCH GIẢI ĐẤU ──────────────────────────────────────── */}
      {activeMainTab === "tournaments" && (
        <div className="space-y-5">
          {/* Sub Filters & Search */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FilterOutlined /> Lọc trạng thái:
              </span>
              <Select
                value={tourneyFilter}
                onChange={(val) => setTourneyFilter(val)}
                className="!w-44 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả giải đấu" },
                  { value: "in_progress", label: "Đang diễn ra" },
                  { value: "open", label: "Đang mở đăng ký" },
                  { value: "upcoming", label: "Sắp diễn ra" },
                  { value: "finished", label: "Đã kết thúc" },
                ]}
              />
            </div>

            <div className="w-full sm:w-72">
              <Input
                placeholder="Tìm tên giải, thể thức..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={tourneySearchQuery}
                onChange={(e) => setTourneySearchQuery(e.target.value)}
                allowClear
                className="!rounded-xl !h-10 text-xs"
              />
            </div>
          </div>

          {/* Tournament Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTournaments.map((tourney) => {
              const percent = Math.round(
                (tourney.registeredCount / tourney.maxParticipants) * 100
              );
              return (
                <Card
                  key={tourney.id}
                  className="!rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all p-5 flex flex-col justify-between bg-white"
                >
                  <div>
                    {/* Top Row: Status badge & Prize */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Tag
                        color={
                          tourney.status === "in_progress"
                            ? "error"
                            : tourney.status === "open"
                            ? "green"
                            : tourney.status === "upcoming"
                            ? "gold"
                            : "default"
                        }
                        className="!rounded-full !px-3 !py-0.5 !text-xs !font-black inline-flex items-center gap-1"
                      >
                        {tourney.status === "in_progress" && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping mr-1" />}
                        {tourney.statusText}
                      </Tag>

                      <span className="font-extrabold text-emerald-700 text-sm">
                        {tourney.prizePool}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-black text-slate-900 text-lg mb-2 leading-snug">
                      {tourney.title}
                    </h3>

                    {/* Meta info */}
                    <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Thể thức thi đấu:</span>
                        <strong className="text-slate-800">{tourney.format}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Thời gian tổ chức:</span>
                        <strong className="text-slate-800">{tourney.date}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Lệ phí tham gia:</span>
                        <strong className="text-emerald-700">{tourney.feeFormatted}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Bàn đấu chỉ định:</span>
                        <strong className="text-slate-800">{tourney.assignedTables.join(", ")}</strong>
                      </div>
                    </div>

                    {/* Registration Progress */}
                    <div className="space-y-1 mb-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Số lượng đăng ký:</span>
                        <span className="font-bold text-slate-900">
                          {tourney.registeredCount} / {tourney.maxParticipants} cơ thủ ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenParticipants(tourney)}
                      leftIcon={<TeamOutlined />}
                      className="!rounded-xl !text-xs !h-9 font-bold !text-slate-700"
                    >
                      Duyệt Cơ Thủ ({tourney.registeredCount})
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setActiveMainTab("referee_live");
                        message.info(`Đang chuyển sang Bảng Điểm Trọng Tài cho giải "${tourney.title}"`);
                      }}
                      leftIcon={<ThunderboltOutlined />}
                      className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !text-xs !h-9 font-bold"
                    >
                      Chấm Điểm Trận Đấu
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: BẢNG ĐIỂM TRỌNG TÀI BANK POOL (LIVE REFEREE SCORING) ────── */}
      {activeMainTab === "referee_live" && (
        <div className="space-y-6">
          {/* Match Context Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-black text-rose-600 uppercase tracking-widest">
                  LIVE MATCH REFEREE CONSOLE
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                {activeMatch.tournamentName}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Bàn: <strong className="text-emerald-700">{activeMatch.tableName}</strong>
                </span>
                <span>•</span>
                <span>
                  Trọng tài: <strong>{activeMatch.refereeName}</strong>
                </span>
                <span>•</span>
                <span>
                  Thể thức: <strong>Race to {activeMatch.raceTo} (Chạm {activeMatch.raceTo})</strong>
                </span>
              </div>
            </div>

            {/* Match Selector & Control */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={currentMatchId}
                onChange={(val) => {
                  setCurrentMatchId(val);
                  handleResetShotClock();
                }}
                className="!w-64 !rounded-xl !text-xs"
                options={[
                  {
                    value: "MATCH-BP-01",
                    label: "Bán Kết 1: Tuấn Anh vs Minh Quang",
                  },
                  {
                    value: "MATCH-BP-02",
                    label: "Bán Kết 2: Quốc Bảo vs Hoàng Nam",
                  },
                ]}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetMatch}
                className="!rounded-xl !text-xs !border-slate-300"
              >
                Reset 0 - 0
              </Button>
            </div>
          </div>

          {/* Digital Scoreboard (Player 1 vs Player 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* PLAYER 1 (5 cols) */}
            <div
              className={`lg:col-span-5 rounded-3xl border p-6 flex flex-col justify-between transition-all shadow-xs ${
                isPlayer1Active
                  ? "bg-emerald-50/50 border-emerald-500 ring-4 ring-emerald-500/15"
                  : "bg-white border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Cơ Thủ 1
                  </span>
                  {isPlayer1Active ? (
                    <Tag color="green" className="!rounded-full !px-3 !py-1 !text-xs !font-black animate-pulse">
                      ĐANG TỚI LƯỢT ĐÁNH
                    </Tag>
                  ) : (
                    <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !bg-slate-100">
                      CHỜ LƯỢT
                    </Tag>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <img
                    src={activeMatch.player1.avatar}
                    alt={activeMatch.player1.name}
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-xs"
                  />
                  <div>
                    <h4 className="text-lg font-black text-slate-900 mb-0.5">
                      {activeMatch.player1.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Tag color="cyan" className="!text-[10px] !font-bold !px-2 !py-0 !rounded-md">
                        {activeMatch.player1.rank}
                      </Tag>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        ELO {activeMatch.player1.elo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Big Display */}
                <div className="py-6 px-4 rounded-3xl bg-slate-950 text-white text-center mb-5 shadow-inner font-mono relative overflow-hidden">
                  <span className="text-[11px] uppercase tracking-widest text-slate-400 block mb-1">
                    SỐ VÁN THẮNG (RACKS)
                  </span>
                  <span className="text-7xl font-black text-emerald-400 tracking-tight">
                    {activeMatch.player1.score}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Mục tiêu: Race to {activeMatch.raceTo}
                  </span>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-5">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
                    <span className="text-[11px] text-slate-500 block">Bi ăn băng</span>
                    <span className="text-base font-black text-slate-900">
                      {activeMatch.player1.bankShots} bi
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBankShotCount(1)}
                      className="!mt-1 !h-6 !text-[10px] !font-bold !bg-slate-100 !w-full"
                    >
                      +1 Bi Hợp Lệ
                    </Button>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 text-center shadow-2xs">
                    <span className="text-[11px] text-rose-700 block">Lỗi phạm quy</span>
                    <span className="text-base font-black text-rose-800">
                      {activeMatch.player1.fouls} lần
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFoul(1)}
                      className="!mt-1 !h-6 !text-[10px] !font-bold !bg-rose-100 !text-rose-700 !w-full"
                    >
                      Báo Lỗi Foul
                    </Button>
                  </div>
                </div>
              </div>

              {/* Player 1 Actions */}
              <div className="pt-3 border-t border-slate-200">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleScoreRackPoint(1)}
                  leftIcon={<ThunderboltOutlined />}
                  className="!w-full !rounded-2xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-black text-sm !h-12 shadow-sm"
                >
                  +1 THẮNG VÁN ĐẤU (RACK)
                </Button>
              </div>
            </div>

            {/* CENTER CONTROLS: SHOT-CLOCK & VAR (2 cols) */}
            <div className="lg:col-span-2 flex flex-col items-center justify-between py-2 gap-4">
              {/* VS Badge */}
              <div className="h-14 w-14 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-lg shadow-md border-4 border-white">
                VS
              </div>

              {/* Shot-Clock Timer Box */}
              <div className="w-full bg-white rounded-3xl border border-slate-200 p-4 shadow-xs text-center space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  SHOT-CLOCK
                </span>
                <div
                  className={`text-4xl font-black font-mono tracking-tight ${
                    shotClockSeconds <= 5
                      ? "text-rose-600 animate-pulse"
                      : shotClockSeconds <= 10
                      ? "text-amber-500"
                      : "text-slate-900"
                  }`}
                >
                  {shotClockSeconds}s
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {!isShotClockRunning ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleStartShotClock}
                      className="!h-8 !px-3 !rounded-xl !bg-emerald-600 !text-xs !font-bold"
                    >
                      Bắt đầu
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseShotClock}
                      className="!h-8 !px-3 !rounded-xl !border-amber-300 !text-amber-700 !text-xs !font-bold"
                    >
                      Tạm dừng
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetShotClock}
                    className="!h-8 !px-2.5 !rounded-xl !bg-slate-100 !text-xs"
                  >
                    40s
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTimeOut30s}
                  className="!w-full !rounded-xl !text-[11px] !border-blue-200 !text-blue-700 hover:!bg-blue-50"
                >
                  Hội Ý 30s (Time-out)
                </Button>
              </div>

              {/* Switch Turn Button */}
              <Button
                variant="outline"
                size="md"
                onClick={handleSwitchTurn}
                leftIcon={<SwapOutlined />}
                className="!w-full !rounded-2xl !border-slate-300 !bg-white !text-slate-800 font-bold !text-xs !h-11 shadow-xs"
              >
                Đổi Lượt Đánh
              </Button>

              {/* VAR Review Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerVarReview}
                leftIcon={<VideoCameraOutlined />}
                className="!w-full !rounded-2xl !border-rose-200 !bg-rose-50/70 !text-rose-700 hover:!bg-rose-100 font-bold !text-xs !h-10"
              >
                Ghi Nhận VAR
              </Button>
            </div>

            {/* PLAYER 2 (5 cols) */}
            <div
              className={`lg:col-span-5 rounded-3xl border p-6 flex flex-col justify-between transition-all shadow-xs ${
                isPlayer2Active
                  ? "bg-emerald-50/50 border-emerald-500 ring-4 ring-emerald-500/15"
                  : "bg-white border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Cơ Thủ 2
                  </span>
                  {isPlayer2Active ? (
                    <Tag color="green" className="!rounded-full !px-3 !py-1 !text-xs !font-black animate-pulse">
                      ĐANG TỚI LƯỢT ĐÁNH
                    </Tag>
                  ) : (
                    <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !bg-slate-100">
                      CHỜ LƯỢT
                    </Tag>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <img
                    src={activeMatch.player2.avatar}
                    alt={activeMatch.player2.name}
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-xs"
                  />
                  <div>
                    <h4 className="text-lg font-black text-slate-900 mb-0.5">
                      {activeMatch.player2.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Tag color="blue" className="!text-[10px] !font-bold !px-2 !py-0 !rounded-md">
                        {activeMatch.player2.rank}
                      </Tag>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        ELO {activeMatch.player2.elo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Big Display */}
                <div className="py-6 px-4 rounded-3xl bg-slate-950 text-white text-center mb-5 shadow-inner font-mono relative overflow-hidden">
                  <span className="text-[11px] uppercase tracking-widest text-slate-400 block mb-1">
                    SỐ VÁN THẮNG (RACKS)
                  </span>
                  <span className="text-7xl font-black text-emerald-400 tracking-tight">
                    {activeMatch.player2.score}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Mục tiêu: Race to {activeMatch.raceTo}
                  </span>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-5">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
                    <span className="text-[11px] text-slate-500 block">Bi ăn băng</span>
                    <span className="text-base font-black text-slate-900">
                      {activeMatch.player2.bankShots} bi
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBankShotCount(2)}
                      className="!mt-1 !h-6 !text-[10px] !font-bold !bg-slate-100 !w-full"
                    >
                      +1 Bi Hợp Lệ
                    </Button>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 text-center shadow-2xs">
                    <span className="text-[11px] text-rose-700 block">Lỗi phạm quy</span>
                    <span className="text-base font-black text-rose-800">
                      {activeMatch.player2.fouls} lần
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFoul(2)}
                      className="!mt-1 !h-6 !text-[10px] !font-bold !bg-rose-100 !text-rose-700 !w-full"
                    >
                      Báo Lỗi Foul
                    </Button>
                  </div>
                </div>
              </div>

              {/* Player 2 Actions */}
              <div className="pt-3 border-t border-slate-200">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleScoreRackPoint(2)}
                  leftIcon={<ThunderboltOutlined />}
                  className="!w-full !rounded-2xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-black text-sm !h-12 shadow-sm"
                >
                  +1 THẮNG VÁN ĐẤU (RACK)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SƠ ĐỒ NHÁNH ĐẤU (TOURNAMENT BRACKET TREE) ──────────────── */}
      {activeMainTab === "brackets" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Nhánh Đấu: CueZone Bank Pool Open Championship Q2/2026
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Sơ đồ vòng loại trực tiếp (Knock-out) Single Elimination • Race to 5
              </p>
            </div>
            <Tag color="green" className="!rounded-full !px-3 !py-1 !text-xs !font-bold">
              ĐANG THI ĐẤU BÁN KẾT
            </Tag>
          </div>

          {/* Bracket Tree Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Column 1: Tứ Kết (Quarter Finals) */}
            <div className="space-y-4">
              <span className="text-xs font-black uppercase text-slate-400 block tracking-wider text-center">
                VÒNG TỨ KẾT (QF)
              </span>

              {/* Match QF 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>1. Đặng Tuấn Anh (1850)</span>
                  <span className="text-emerald-700 font-mono">5</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>8. Vũ Hải Đăng (1780)</span>
                  <span className="font-mono">2</span>
                </div>
                <div className="pt-1 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
                  <span>Bàn 01</span>
                  <span className="text-emerald-700 font-bold">Tuấn Anh thắng</span>
                </div>
              </div>

              {/* Match QF 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>4. Trần Minh Quang (1820)</span>
                  <span className="text-emerald-700 font-mono">5</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>5. Trần Đình Trọng (1750)</span>
                  <span className="font-mono">4</span>
                </div>
                <div className="pt-1 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
                  <span>Bàn 02</span>
                  <span className="text-emerald-700 font-bold">Minh Quang thắng</span>
                </div>
              </div>

              {/* Match QF 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>2. Lê Quốc Bảo (1880)</span>
                  <span className="text-emerald-700 font-mono">5</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>7. Phan Gia Huy (1740)</span>
                  <span className="font-mono">1</span>
                </div>
                <div className="pt-1 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
                  <span>Bàn 05</span>
                  <span className="text-emerald-700 font-bold">Quốc Bảo thắng</span>
                </div>
              </div>

              {/* Match QF 4 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>3. Nguyễn Hoàng Nam (1940)</span>
                  <span className="text-emerald-700 font-mono">5</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>6. Bùi Hữu Lộc (1760)</span>
                  <span className="font-mono">3</span>
                </div>
                <div className="pt-1 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
                  <span>Bàn 06</span>
                  <span className="text-emerald-700 font-bold">Hoàng Nam thắng</span>
                </div>
              </div>
            </div>

            {/* Column 2: Bán Kết (Semi Finals) */}
            <div className="space-y-6">
              <span className="text-xs font-black uppercase text-rose-600 block tracking-wider text-center">
                VÒNG BÁN KẾT (LIVE TRỌNG TÀI)
              </span>

              {/* Match SF 1 (Active) */}
              <div className="p-4 rounded-3xl bg-emerald-50/70 border-2 border-emerald-500 text-xs space-y-2 shadow-xs ring-2 ring-emerald-500/10">
                <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold">
                  <span>BÁN KẾT 1 • BÀN MATCH 13 (VAR)</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black animate-pulse">
                    LIVE
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 text-sm">
                  <span>Đặng Tuấn Anh</span>
                  <span className="text-emerald-700 font-mono text-base">
                    {matchDataMap["MATCH-BP-01"]?.player1.score ?? 2}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 text-sm">
                  <span>Trần Minh Quang</span>
                  <span className="text-emerald-700 font-mono text-base">
                    {matchDataMap["MATCH-BP-01"]?.player2.score ?? 1}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setCurrentMatchId("MATCH-BP-01");
                    setActiveMainTab("referee_live");
                  }}
                  leftIcon={<ThunderboltOutlined />}
                  className="!w-full !rounded-xl !bg-emerald-600 !text-xs !h-8 font-bold !mt-2"
                >
                  Chấm Điểm Trực Tiếp
                </Button>
              </div>

              {/* Match SF 2 (Active) */}
              <div className="p-4 rounded-3xl bg-emerald-50/70 border-2 border-emerald-500 text-xs space-y-2 shadow-xs ring-2 ring-emerald-500/10">
                <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold">
                  <span>BÁN KẾT 2 • BÀN MATCH 14 (VAR)</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black animate-pulse">
                    LIVE
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 text-sm">
                  <span>Lê Quốc Bảo</span>
                  <span className="text-emerald-700 font-mono text-base">
                    {matchDataMap["MATCH-BP-02"]?.player1.score ?? 3}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 text-sm">
                  <span>Nguyễn Hoàng Nam</span>
                  <span className="text-emerald-700 font-mono text-base">
                    {matchDataMap["MATCH-BP-02"]?.player2.score ?? 4}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setCurrentMatchId("MATCH-BP-02");
                    setActiveMainTab("referee_live");
                  }}
                  leftIcon={<ThunderboltOutlined />}
                  className="!w-full !rounded-xl !bg-emerald-600 !text-xs !h-8 font-bold !mt-2"
                >
                  Chấm Điểm Trực Tiếp
                </Button>
              </div>
            </div>

            {/* Column 3: Chung Kết (Grand Final) */}
            <div className="space-y-4">
              <span className="text-xs font-black uppercase text-amber-500 block tracking-wider text-center">
                TRẬN CHUNG KẾT TRANH CÚP VÀNG
              </span>

              <div className="p-5 rounded-3xl bg-amber-50/60 border-2 border-dashed border-amber-300 text-xs space-y-3 shadow-xs text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl shadow-xs">
                  <TrophyOutlined />
                </div>
                <h4 className="font-black text-slate-900 text-base mb-1">
                  Chung Kết Vô Địch Q2
                </h4>
                <div className="p-3 bg-white rounded-2xl border border-amber-200 text-slate-600 space-y-1">
                  <div>Thắng Bán Kết 1 vs Thắng Bán Kết 2</div>
                  <div className="font-bold text-amber-800">
                    Tranh Cúp & 8.000.000 VNĐ
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Dự kiến khởi tranh lúc 17:00 hôm nay tại Bàn Match 13 (VAR)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: BẢNG XẾP HẠNG ELO CLB ───────────────────────────────────── */}
      {activeMainTab === "leaderboard" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Bảng Xếp Hạng ELO Cơ Thủ CLB CueZone
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Hệ số ELO cập nhật tự động sau mỗi trận đấu giải Bank Pool chính thức
              </p>
            </div>
            <Tag color="cyan" className="!rounded-full !px-3 !py-1 !text-xs !font-bold">
              CHUẨN WPA ELO RATING
            </Tag>
          </div>

          <Table<PlayerRankItem>
            columns={leaderboardColumns}
            dataSource={LEADERBOARD_DATA}
            rowKey="id"
            pagination={false}
          />
        </div>
      )}

      {/* ── MODAL: TẠO GIẢI ĐẤU MỚI ────────────────────────────────────────── */}
      <Modal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={640}
        title={
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrophyOutlined className="text-base" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-base block leading-tight">
                Thiết Lập Giải Đấu Bida Mới
              </span>
              <span className="text-xs text-slate-500 font-normal">
                Tạo giải đấu Bank Pool, quy định thể thức Race to X và phân bổ bàn đấu
              </span>
            </div>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên giải đấu chính thức: <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="Ví dụ: CueZone Bank Pool Championship Q3/2026"
              value={newTourneyForm.title}
              onChange={(e) =>
                setNewTourneyForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thể thức Race to (Số ván chạm):
              </label>
              <Input
                type="number"
                value={newTourneyForm.raceTo}
                onChange={(e) =>
                  setNewTourneyForm((prev) => ({
                    ...prev,
                    raceTo: parseInt(e.target.value) || 5,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số lượng cơ thủ tối đa:
              </label>
              <Select
                value={newTourneyForm.maxParticipants}
                onChange={(val) =>
                  setNewTourneyForm((prev) => ({ ...prev, maxParticipants: val }))
                }
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: 8, label: "8 Cơ thủ (Vòng tứ kết)" },
                  { value: 16, label: "16 Cơ thủ (Chuẩn CLB)" },
                  { value: 32, label: "32 Cơ thủ (Giải mở rộng)" },
                  { value: 64, label: "64 Cơ thủ (Giải Pro Quốc gia)" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lệ phí đăng ký (VNĐ):
              </label>
              <Input
                type="number"
                value={newTourneyForm.feeAmount}
                onChange={(e) =>
                  setNewTourneyForm((prev) => ({
                    ...prev,
                    feeAmount: parseInt(e.target.value) || 0,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tổng quỹ giải thưởng:
              </label>
              <Input
                value={newTourneyForm.prizePool}
                onChange={(e) =>
                  setNewTourneyForm((prev) => ({ ...prev, prizePool: e.target.value }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bàn thi đấu chỉ định:
              </label>
              <Input
                placeholder="Bàn Match 13 (VAR), Bàn Match 14 (VAR)..."
                value={newTourneyForm.assignedTables}
                onChange={(e) =>
                  setNewTourneyForm((prev) => ({
                    ...prev,
                    assignedTables: e.target.value,
                  }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCreateModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveNewTournament}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              Tạo & Mở Đăng Ký
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: DUYỆT DANH SÁCH CƠ THỦ ĐĂNG KÝ ─────────────────────────── */}
      <Modal
        open={participantsModalVisible}
        onCancel={() => setParticipantsModalVisible(false)}
        footer={null}
        width={600}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <TeamOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Danh Sách Đăng Ký: {selectedTourneyForParticipants?.title}
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-3 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex justify-between items-center">
            <span>
              Tổng đã đăng ký:{" "}
              <strong>
                {selectedTourneyForParticipants?.registeredCount} /{" "}
                {selectedTourneyForParticipants?.maxParticipants} cơ thủ
              </strong>
            </span>
            <Tag color="green" className="!rounded-full !font-bold">
              ĐÃ THU LỆ PHÍ: 100%
            </Tag>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {LEADERBOARD_DATA.slice(0, 5).map((player) => (
              <div
                key={player.id}
                className="p-3 rounded-2xl border border-slate-200 flex items-center justify-between bg-white"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-9 h-9 rounded-xl object-cover"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{player.name}</span>
                    <span className="text-slate-400 text-[11px]">
                      {player.tier} • ELO {player.elo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Tag color="green" className="!rounded-full !text-[10px] !font-bold">
                    ĐÃ ĐÓNG PHÍ
                  </Tag>
                  <Button
                    variant="outline"
                    size="sm"
                    className="!rounded-xl !text-[11px] !h-7 !border-slate-300"
                  >
                    Xếp Bảng
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              variant="primary"
              size="md"
              onClick={() => setParticipantsModalVisible(false)}
              className="!bg-emerald-600 !rounded-xl !text-xs !font-bold"
            >
              Đóng Danh Sách
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: CAMERA VAR REVIEW ───────────────────────────────────────── */}
      <Modal
        open={varModalVisible}
        onCancel={() => setVarModalVisible(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <VideoCameraOutlined className="text-xl" />
            <span className="font-black text-slate-900 text-base">
              Ghi Nhận & Xem Lại Băng Hình VAR Bida
            </span>
          </div>
        }
      >
        <div className="py-3 space-y-4 text-xs">
          <div className="p-4 rounded-3xl bg-slate-950 text-white text-center space-y-2 relative overflow-hidden border border-slate-800">
            <div className="flex items-center justify-center gap-2 text-rose-500 font-black text-xs uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              CUEZONE VAR SLOW-MOTION CAMERA 60FPS
            </div>
            <div className="py-6 text-slate-400 font-mono text-sm">
              [Replay Bàn Match 13 - Góc máy băng dài số 2]
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs">
              KẾT LUẬN VAR: Bi mục tiêu dội băng hợp lệ trước khi chạm lỗ góc. Cú đánh đạt chuẩn Bank Pool!
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setVarModalVisible(false);
                message.success("Đã ghi nhận kết quả VAR vào biên bản trận đấu!");
              }}
              className="!bg-emerald-600 !rounded-xl font-bold !text-xs px-5"
            >
              Xác Nhận & Tiếp Tục Trận Đấu
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: KẾT THÚC TRẬN ĐẤU & ĐỒNG BỘ ELO ─────────────────────────── */}
      <Modal
        open={finishModalVisible}
        onCancel={() => setFinishModalVisible(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-amber-500">
            <TrophyOutlined className="text-xl" />
            <span className="font-bold text-slate-900 text-base">
              Kết Thúc Trận Đấu & Cập Nhật Điểm ELO
            </span>
          </div>
        }
      >
        <div className="py-3 space-y-4 text-xs">
          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-2">
            <TrophyOutlined className="text-4xl text-amber-500" />
            <div className="font-black text-base text-amber-950">
              Cơ Thủ Chiến Thắng:{" "}
              {winnerId === activeMatch.player1.id
                ? activeMatch.player1.name
                : activeMatch.player2.name}!
            </div>
            <div className="text-xs text-amber-800">
              Tỉ số chung cuộc:{" "}
              <strong>
                {activeMatch.player1.score} - {activeMatch.player2.score}
              </strong>{" "}
              (Race to {activeMatch.raceTo})
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
            <div className="font-bold text-slate-900">Biến động điểm ELO sau trận đấu:</div>
            <div className="flex justify-between items-center">
              <span>{activeMatch.player1.name}:</span>
              <strong
                className={
                  winnerId === activeMatch.player1.id
                    ? "text-emerald-700 font-bold"
                    : "text-rose-600"
                }
              >
                {winnerId === activeMatch.player1.id ? "+25 ELO" : "-15 ELO"}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span>{activeMatch.player2.name}:</span>
              <strong
                className={
                  winnerId === activeMatch.player2.id
                    ? "text-emerald-700 font-bold"
                    : "text-rose-600"
                }
              >
                {winnerId === activeMatch.player2.id ? "+25 ELO" : "-15 ELO"}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setFinishModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setFinishModalVisible(false);
                message.success(
                  "Đã lưu kết quả trận đấu, cập nhật nhánh đấu và đồng bộ bảng xếp hạng ELO!"
                );
              }}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-5 !text-xs"
            >
              Xác Nhận & Cập Nhật Bảng Đấu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminTournamentsPage;
