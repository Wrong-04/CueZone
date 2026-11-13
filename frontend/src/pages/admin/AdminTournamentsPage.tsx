import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TeamOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  message,
  Modal,
  SegmentedPillList,
  Spin,
} from "../../shared/ui";
import {
  tournamentService,
  type TournamentItem,
  type LeaderboardItem,
  type BracketStructure,
} from "../../services/tournament.service";
import { InteractiveBracketTree } from "../../components/tournament/InteractiveBracketTree";
import { getSocket } from "../../services/socket.service";
import { TournamentHero } from "../../components/tournament/TournamentHero";
import { TournamentListTab } from "../../components/tournament/TournamentListTab";
import { TournamentLeaderboardTab } from "../../components/tournament/TournamentLeaderboardTab";
import {
  CreateTournamentDrawer,
  type NewTourneyFormData,
} from "../../components/tournament/CreateTournamentDrawer";
import {
  EditTournamentDrawer,
  type EditTourneyFormData,
} from "../../components/tournament/EditTournamentDrawer";
import { OpenRegistrationModal } from "../../components/tournament/OpenRegistrationModal";
import { ParticipantsModal } from "../../components/tournament/ParticipantsModal";

const initialCreateFormData: NewTourneyFormData = {
  title: "",
  raceTo: 5,
  feeAmount: 0,
  prizePool: "",
  firstPrize: "",
  secondPrize: "",
  thirdPrize: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  maxParticipants: 16,
  assignedTables: "",
  description: "",
};

const formatDateForInput = (isoDate?: string): string => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const AdminTournamentsPage: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<string>("tournaments");

  const [apiTournaments, setApiTournaments] = useState<TournamentItem[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState<boolean>(false);
  const [tourneyFilter, setTourneyFilter] = useState<string>("all");
  const [tourneySearchQuery, setTourneySearchQuery] = useState<string>("");

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loadingBoard, setLoadingBoard] = useState<boolean>(false);
  const [boardError, setBoardError] = useState<string>("");

  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [newTourneyForm, setNewTourneyForm] = useState<NewTourneyFormData>(initialCreateFormData);

  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [selectedTourneyForEdit, setSelectedTourneyForEdit] = useState<TournamentItem | null>(null);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editTourneyForm, setEditTourneyForm] = useState<EditTourneyFormData>({
    title: "",
    raceTo: 5,
    feeAmount: 150000,
    prizePool: "",
    firstPrize: "",
    secondPrize: "",
    thirdPrize: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    maxParticipants: 16,
    assignedTables: "",
    description: "",
  });

  const [statusConfirmModalVisible, setStatusConfirmModalVisible] = useState<boolean>(false);
  const [selectedTourneyForStatusChange, setSelectedTourneyForStatusChange] =
    useState<TournamentItem | null>(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState<boolean>(false);

  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState<boolean>(false);
  const [selectedTourneyForDelete, setSelectedTourneyForDelete] = useState<TournamentItem | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const [participantsModalVisible, setParticipantsModalVisible] = useState<boolean>(false);
  const [selectedTourneyForParticipants, setSelectedTourneyForParticipants] =
    useState<TournamentItem | null>(null);

  const [selectedTourneyForBracket, setSelectedTourneyForBracket] = useState<TournamentItem | null>(null);
  const [bracketData, setBracketData] = useState<BracketStructure | null>(null);
  const [loadingBracket, setLoadingBracket] = useState<boolean>(false);
  const [bracketError, setBracketError] = useState<boolean>(false);
  const [generatingBracket, setGeneratingBracket] = useState<boolean>(false);

  const fetchTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    try {
      const data = await tournamentService.getTournaments();
      setApiTournaments(data.items || []);
    } catch (err: any) {
      console.warn("Chưa thể đồng bộ giải đấu từ server:", err.message);
    } finally {
      setLoadingTournaments(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchTournaments();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchTournaments]);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingBoard(true);
    setBoardError("");
    try {
      setLeaderboard(await tournamentService.getLeaderboard());
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : "Không thể tải bảng xếp hạng");
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  const fetchBracket = useCallback(async (tourneyId: string, silent = false) => {
    if (!silent) setLoadingBracket(true);
    try {
      const data = await tournamentService.getBracket(tourneyId);
      setBracketData(data);
      setBracketError(false);
    } catch {
      if (!silent) {
        setBracketData(null);
        setBracketError(true);
      }
    } finally {
      if (!silent) setLoadingBracket(false);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleScoreUpdated = (payload: any) => {
      if (
        activeMainTab === "brackets" &&
        selectedTourneyForBracket &&
        payload?.tournamentId === selectedTourneyForBracket._id
      ) {
        if (payload.matchId && payload.score1 !== undefined && payload.score2 !== undefined) {
          setBracketData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              rounds: prev.rounds.map((round) => ({
                ...round,
                matches: round.matches.map((m) => {
                  if (m._id !== payload.matchId) return m;
                  return {
                    ...m,
                    status: payload.status || m.status,
                    winnerRegistrationId: payload.winnerRegistrationId ?? m.winnerRegistrationId,
                    participants: m.participants.map((p) => {
                      if (p.slot === 1) return { ...p, score: payload.score1, isWinner: payload.winnerRegistrationId ? String(payload.winnerRegistrationId) === String(p.registrationId) : p.isWinner };
                      if (p.slot === 2) return { ...p, score: payload.score2, isWinner: payload.winnerRegistrationId ? String(payload.winnerRegistrationId) === String(p.registrationId) : p.isWinner };
                      return p;
                    }),
                  };
                }),
              })),
            };
          });
        }
      }
    };

    const handleMatchCompleted = (payload: any) => {
      if (
        activeMainTab === "brackets" &&
        selectedTourneyForBracket &&
        payload?.tournamentId === selectedTourneyForBracket._id
      ) {
        setBracketData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            rounds: prev.rounds.map((round) => ({
              ...round,
              matches: round.matches.map((m) => {
                if (m._id === payload.matchId) {
                  return {
                    ...m,
                    status: payload.status ?? "completed",
                    winnerRegistrationId: payload.winnerRegistrationId,
                  };
                }
                if (payload.nextMatchId && m._id === payload.nextMatchId && payload.nextMatchSlot && payload.winnerUser) {
                  const remaining = m.participants.filter((p) => p.slot !== payload.nextMatchSlot);
                  return {
                    ...m,
                    participants: [
                      ...remaining,
                      {
                        slot: payload.nextMatchSlot,
                        registrationId: payload.winnerRegistrationId,
                        user: payload.winnerUser,
                        score: 0,
                        isWinner: null,
                      },
                    ],
                  };
                }
                return m;
              }),
            })),
          };
        });
      }
    };

    const handleBracketUpdated = (payload: any) => {
      if (
        activeMainTab === "brackets" &&
        selectedTourneyForBracket &&
        payload?.tournamentId === selectedTourneyForBracket._id
      ) {
        void fetchBracket(selectedTourneyForBracket._id, true);
      }
    };

    socket.on("tournament:score_updated", handleScoreUpdated);
    socket.on("tournament:match_completed", handleMatchCompleted);
    socket.on("tournament:bracket_updated", handleBracketUpdated);
    const handleLeaderboardUpdated = () => {
      if (activeMainTab === "leaderboard") void fetchLeaderboard();
    };
    socket.on("tournament:leaderboard_updated", handleLeaderboardUpdated);

    return () => {
      socket.off("tournament:leaderboard_updated", handleLeaderboardUpdated);
      socket.off("tournament:score_updated", handleScoreUpdated);
      socket.off("tournament:match_completed", handleMatchCompleted);
      socket.off("tournament:bracket_updated", handleBracketUpdated);
    };
  }, [activeMainTab, selectedTourneyForBracket, fetchBracket, fetchLeaderboard]);

  const handleGenerateBracket = async () => {
    if (!selectedTourneyForBracket) return;
    setGeneratingBracket(true);
    try {
      const data = await tournamentService.generateBracket(selectedTourneyForBracket._id);
      setBracketData(data);
      setBracketError(false);
      message.success("Đã sinh cây nhánh đấu Single Elimination thành công!");
      void fetchTournaments();
    } catch (err: any) {
      message.error(err?.message || "Không thể sinh cây nhánh đấu");
    } finally {
      setGeneratingBracket(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === "brackets" && !selectedTourneyForBracket && apiTournaments.length > 0) {
      const defaultT =
        apiTournaments.find(
          (t) =>
            t.status === "bracket_generated" ||
            t.status === "in_progress" ||
            t.status === "registration_closed",
        ) || apiTournaments[0];
      setSelectedTourneyForBracket(defaultT);
    }
  }, [activeMainTab, selectedTourneyForBracket, apiTournaments]);

  useEffect(() => {
    if (activeMainTab === "brackets" && selectedTourneyForBracket) {
      void fetchBracket(selectedTourneyForBracket._id);
    }
  }, [activeMainTab, selectedTourneyForBracket, fetchBracket]);

  useEffect(() => {
    if (activeMainTab !== "leaderboard") return;
    const load = window.setTimeout(() => void fetchLeaderboard(), 0);
    return () => window.clearTimeout(load);
  }, [activeMainTab, fetchLeaderboard]);

  const filteredTournaments = useMemo(() => {
    return apiTournaments.filter((item) => {
      const matchStatus = tourneyFilter === "all" || item.status === tourneyFilter;
      const q = tourneySearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.format && item.format.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [apiTournaments, tourneyFilter, tourneySearchQuery]);

  const metrics = useMemo(() => {
    const totalTourneys = apiTournaments.length;
    const activeCount = apiTournaments.filter(
      (t) => t.status === "registration_open" || t.status === "in_progress",
    ).length;
    const totalRegistered = apiTournaments.reduce(
      (acc, cur) => acc + (cur.players?.length || 0),
      0,
    );
    const inProgressCount = apiTournaments.filter((t) => t.status === "in_progress").length;
    const assignedTableCount = new Set(apiTournaments.flatMap((t) => t.assignedTables || [])).size;
    return { totalTourneys, activeCount, totalRegistered, inProgressCount, assignedTableCount };
  }, [apiTournaments]);

  const nextTournament = useMemo(
    () =>
      apiTournaments
        .filter((t) => t.status !== "draft" && t.status !== "completed")
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0],
    [apiTournaments],
  );

  const mainTabPills = [
    { key: "tournaments", label: "Sảnh Giải Đấu CLB", badge: apiTournaments.length },
    { key: "brackets", label: "Nhánh Đấu" },
    { key: "leaderboard", label: "Bảng Xếp Hạng ELO", badge: leaderboard.length || undefined },
  ];

  const handleSaveNewTournament = async () => {
    if (!newTourneyForm.title.trim()) {
      message.warning("Vui lòng nhập tên giải đấu!");
      return;
    }

    if (
      !newTourneyForm.startDate ||
      !newTourneyForm.endDate ||
      !newTourneyForm.registrationDeadline
    ) {
      message.warning("Vui lòng nhập đầy đủ ngày thi đấu và hạn đăng ký!");
      return;
    }

    if (new Date(newTourneyForm.registrationDeadline) <= new Date()) {
      message.error("Hạn chót đăng ký phải sau thời điểm hiện tại!");
      return;
    }

    const regDate = new Date(newTourneyForm.registrationDeadline);
    const sDate = new Date(newTourneyForm.startDate);
    const eDate = new Date(newTourneyForm.endDate);

    if (regDate >= sDate) {
      message.error("Hạn đăng ký bắt buộc phải diễn ra trước ngày khai mạc giải đấu!");
      return;
    }

    if (eDate < sDate) {
      message.error("Ngày kết thúc thi đấu phải sau hoặc bằng ngày bắt đầu!");
      return;
    }

    setCreateLoading(true);
    try {
      await tournamentService.createTournament({
        name: newTourneyForm.title.trim(),
        description: newTourneyForm.description.trim(),
        startDate: sDate.toISOString(),
        endDate: eDate.toISOString(),
        registrationDeadline: regDate.toISOString(),
        maxPlayers: Number(newTourneyForm.maxParticipants) || 16,
        registrationFee: Number(newTourneyForm.feeAmount) || 0,
        prizePool: newTourneyForm.prizePool,
        firstPrize: newTourneyForm.firstPrize,
        secondPrize: newTourneyForm.secondPrize,
        thirdPrize: newTourneyForm.thirdPrize,
        raceToScore: Number(newTourneyForm.raceTo) || 5,
        assignedTables: newTourneyForm.assignedTables,
      });

      message.success(
        `Đã tạo thành công giải đấu "${newTourneyForm.title}" ở trạng thái Bản Nháp (DRAFT)!`,
      );
      setNewTourneyForm(initialCreateFormData);
      setCreateModalVisible(false);
      void fetchTournaments();
    } catch (err: any) {
      message.error(err?.message || "Tạo giải đấu thất bại, vui lòng kiểm tra lại thông tin!");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmOpenRegistration = async () => {
    if (!selectedTourneyForStatusChange) return;

    if (selectedTourneyForStatusChange.registrationDeadline) {
      const deadline = new Date(selectedTourneyForStatusChange.registrationDeadline);
      if (deadline.getTime() < Date.now()) {
        message.error(
          "Hạn đăng ký của giải đấu này đã trôi qua trong quá khứ! Vui lòng bấm 'Sửa thông tin' để gia hạn trước khi mở đăng ký.",
        );
        return;
      }
    }

    setStatusChangeLoading(true);
    try {
      await tournamentService.changeStatus(selectedTourneyForStatusChange._id, "registration_open");
      message.success(
        `Đã mở đăng ký chính thức cho giải đấu "${selectedTourneyForStatusChange.name}"!`,
      );
      setStatusConfirmModalVisible(false);
      setSelectedTourneyForStatusChange(null);
      void fetchTournaments();
    } catch (err: any) {
      message.error(err?.message || "Không thể chuyển trạng thái giải đấu!");
    } finally {
      setStatusChangeLoading(false);
    }
  };

  const handleOpenEditModal = (tourney: TournamentItem) => {
    setSelectedTourneyForEdit(tourney);
    setEditTourneyForm({
      title: tourney.name,
      raceTo: tourney.raceToScore || 5,
      feeAmount: tourney.registrationFee || 0,
      prizePool: tourney.prizePool || "",
      firstPrize: tourney.firstPrize || "",
      secondPrize: tourney.secondPrize || "",
      thirdPrize: tourney.thirdPrize || "",
      startDate: formatDateForInput(tourney.startDate),
      endDate: formatDateForInput(tourney.endDate),
      registrationDeadline: formatDateForInput(tourney.registrationDeadline),
      maxParticipants: tourney.maxPlayers || 16,
      assignedTables: tourney.assignedTables?.join(", ") || "",
      description: tourney.description || "",
    });
    setEditModalVisible(true);
  };

  const handleUpdateTournament = async () => {
    if (!selectedTourneyForEdit) return;
    if (!editTourneyForm.title.trim()) {
      message.warning("Vui lòng nhập tên giải đấu!");
      return;
    }
    if (
      !editTourneyForm.startDate ||
      !editTourneyForm.endDate ||
      !editTourneyForm.registrationDeadline
    ) {
      message.warning("Vui lòng nhập đầy đủ ngày thi đấu và hạn đăng ký!");
      return;
    }

    const regDate = new Date(editTourneyForm.registrationDeadline);
    const sDate = new Date(editTourneyForm.startDate);
    const eDate = new Date(editTourneyForm.endDate);

    if (regDate >= sDate) {
      message.error("Hạn đăng ký bắt buộc phải diễn ra trước ngày khai mạc giải đấu!");
      return;
    }

    if (eDate < sDate) {
      message.error("Ngày kết thúc thi đấu phải sau hoặc bằng ngày bắt đầu!");
      return;
    }

    setEditLoading(true);
    try {
      await tournamentService.updateTournament(selectedTourneyForEdit._id, {
        name: editTourneyForm.title.trim(),
        description: editTourneyForm.description.trim(),
        startDate: sDate.toISOString(),
        endDate: eDate.toISOString(),
        registrationDeadline: regDate.toISOString(),
        maxPlayers: Number(editTourneyForm.maxParticipants) || 16,
        registrationFee: Number(editTourneyForm.feeAmount) || 0,
        prizePool: editTourneyForm.prizePool,
        firstPrize: editTourneyForm.firstPrize,
        secondPrize: editTourneyForm.secondPrize,
        thirdPrize: editTourneyForm.thirdPrize,
        raceToScore: Number(editTourneyForm.raceTo) || 5,
        assignedTables: editTourneyForm.assignedTables,
      });

      message.success(`Đã cập nhật giải đấu "${editTourneyForm.title}" thành công!`);
      setEditModalVisible(false);
      setSelectedTourneyForEdit(null);
      void fetchTournaments();
    } catch (err: any) {
      message.error(err?.message || "Cập nhật giải đấu thất bại!");
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDeleteTournament = async () => {
    if (!selectedTourneyForDelete) return;
    setDeleteLoading(true);
    try {
      await tournamentService.deleteTournament(selectedTourneyForDelete._id);
      message.success(`Đã xóa giải đấu bản nháp "${selectedTourneyForDelete.name}"!`);
      setDeleteConfirmModalVisible(false);
      setSelectedTourneyForDelete(null);
      void fetchTournaments();
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa giải đấu!");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 pb-12 px-3 sm:px-6">
      <div className="-mx-3 sm:-mx-6 mb-4">
        <TournamentHero
          metrics={metrics}
          nextTournament={nextTournament}
          onCreateClick={() => setCreateModalVisible(true)}
          onLeaderboardClick={() => setActiveMainTab("leaderboard")}
          onRefreshClick={() => void fetchTournaments()}
        />
      </div>

      <div className="bg-[#0f172a] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedPillList
          items={mainTabPills}
          activeKey={activeMainTab}
          onSelect={(key) => setActiveMainTab(key)}
          className="!bg-slate-900 !border-slate-800"
        />
      </div>

      {activeMainTab === "tournaments" && (
        <TournamentListTab
          tournaments={filteredTournaments}
          loading={loadingTournaments}
          filter={tourneyFilter}
          searchQuery={tourneySearchQuery}
          onFilterChange={setTourneyFilter}
          onSearchChange={setTourneySearchQuery}
          onCreateClick={() => setCreateModalVisible(true)}
          onEdit={handleOpenEditModal}
          onDelete={(t) => {
            setSelectedTourneyForDelete(t);
            setDeleteConfirmModalVisible(true);
          }}
          onOpenRegistration={(t) => {
            setSelectedTourneyForStatusChange(t);
            setStatusConfirmModalVisible(true);
          }}
          onViewParticipants={(t) => {
            setSelectedTourneyForParticipants(t);
            setParticipantsModalVisible(true);
          }}
        />
      )}

      {activeMainTab === "brackets" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
              <span className="text-sm font-semibold text-slate-300">Chọn giải đấu:</span>
              <select
                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm w-full sm:w-auto min-w-[240px]"
                value={selectedTourneyForBracket?._id || ""}
                onChange={(e) => {
                  const t = apiTournaments.find((item) => item._id === e.target.value) || null;
                  setSelectedTourneyForBracket(t);
                }}
              >
                {apiTournaments.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <Button
                onClick={() => selectedTourneyForBracket && fetchBracket(selectedTourneyForBracket._id)}
                loading={loadingBracket}
                size="middle"
              >
                Tải lại
              </Button>

              {selectedTourneyForBracket && !bracketError && (
                <Button
                  type="primary"
                  onClick={handleGenerateBracket}
                  loading={generatingBracket}
                  className="!bg-emerald-600 hover:!bg-emerald-500 font-semibold"
                >
                  {bracketData && bracketData.rounds.length > 0 ? "Sinh lại nhánh đấu" : "Tạo nhánh đấu"}
                </Button>
              )}
            </div>
          </div>

          {loadingBracket ? (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center text-slate-400">
              <Spin /> <span className="ml-2">Đang tải cây nhánh đấu...</span>
            </div>
          ) : bracketError ? (
            <Alert
              type="error"
              showIcon
              title="Không tải được cây nhánh đấu"
              description="Vui lòng kiểm tra kết nối rồi thử lại. Nhánh đấu hiện có không bị thay đổi."
              action={
                <Button
                  size="small"
                  onClick={() => selectedTourneyForBracket && void fetchBracket(selectedTourneyForBracket._id)}
                >
                  Thử lại
                </Button>
              }
            />
          ) : bracketData && bracketData.rounds.length > 0 ? (
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-4 sm:p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{bracketData.tournament.name}</h3>
                  <p className="text-slate-400 text-xs">
                    Quy mô: {bracketData.tournament.bracketSize} cơ thủ • {bracketData.tournament.totalRounds} vòng đấu • {bracketData.tournament.totalMatches} trận
                  </p>
                </div>
              </div>
              <InteractiveBracketTree
                bracket={bracketData}
                onRefresh={() => selectedTourneyForBracket && fetchBracket(selectedTourneyForBracket._id)}
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-b from-[#064e3b] to-[#042f24] border-2 border-slate-800 p-8 sm:p-12 text-center text-white shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-300/30 text-amber-300 flex items-center justify-center mx-auto mb-3 text-2xl">
                <TeamOutlined />
              </div>
              <h4 className="text-white font-black text-base mb-1">Chưa có cây nhánh đấu</h4>
              <p className="text-emerald-100/75 text-xs max-w-md mx-auto leading-relaxed mb-4">
                Giải đấu này chưa được tạo nhánh đấu hoặc chưa có dữ liệu trận đấu. Bấm nút bên dưới để tạo nhánh Single Elimination tự động.
              </p>
              {selectedTourneyForBracket && (
                <Button
                  type="primary"
                  onClick={handleGenerateBracket}
                  loading={generatingBracket}
                  className="!bg-emerald-500 !text-slate-950 font-bold hover:!bg-emerald-400"
                >
                  Sinh Nhánh Đấu Ngay
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeMainTab === "leaderboard" && (
        <TournamentLeaderboardTab
          leaderboard={leaderboard}
          loading={loadingBoard}
          error={boardError}
          onRefresh={() => void fetchLeaderboard()}
        />
      )}

      <CreateTournamentDrawer
        open={createModalVisible}
        loading={createLoading}
        formData={newTourneyForm}
        onChange={setNewTourneyForm}
        onSave={handleSaveNewTournament}
        onClose={() => {
          if (!createLoading) setCreateModalVisible(false);
        }}
      />

      <EditTournamentDrawer
        open={editModalVisible}
        loading={editLoading}
        formData={editTourneyForm}
        onChange={setEditTourneyForm}
        onSave={handleUpdateTournament}
        onClose={() => {
          if (!editLoading) {
            setEditModalVisible(false);
            setSelectedTourneyForEdit(null);
          }
        }}
      />

      <OpenRegistrationModal
        open={statusConfirmModalVisible}
        loading={statusChangeLoading}
        tournament={selectedTourneyForStatusChange}
        onConfirm={handleConfirmOpenRegistration}
        onClose={() => {
          if (!statusChangeLoading) {
            setStatusConfirmModalVisible(false);
            setSelectedTourneyForStatusChange(null);
          }
        }}
      />

      <ParticipantsModal
        open={participantsModalVisible}
        tournament={selectedTourneyForParticipants}
        onClose={() => {
          setParticipantsModalVisible(false);
          void fetchTournaments();
        }}
      />

      <Modal
        open={deleteConfirmModalVisible}
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteConfirmModalVisible(false);
            setSelectedTourneyForDelete(null);
          }
        }}
        footer={null}
        width={440}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <DeleteOutlined className="text-rose-500 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Xác Nhận Xóa Giải Đấu Bản Nháp
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-3 text-xs text-slate-600">
          <p>Bạn có chắc chắn muốn xóa vĩnh viễn giải đấu bản nháp này?</p>
          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900">
            <strong className="text-sm block mb-0.5">{selectedTourneyForDelete?.name}</strong>
            <span className="text-[11px] text-rose-700">Trạng thái: Bản nháp (DRAFT)</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Hành động này không thể hoàn tác sau khi xác nhận.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              disabled={deleteLoading}
              onClick={() => {
                setDeleteConfirmModalVisible(false);
                setSelectedTourneyForDelete(null);
              }}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={deleteLoading}
              onClick={handleConfirmDeleteTournament}
              className="!bg-rose-600 hover:!bg-rose-700 !border-rose-600 !rounded-xl !font-bold px-5 !text-xs text-white"
            >
              Đồng Ý Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminTournamentsPage;

