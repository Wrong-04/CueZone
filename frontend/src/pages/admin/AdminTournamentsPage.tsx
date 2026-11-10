import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TeamOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Button,
  message,
  Modal,
  SegmentedPillList,
} from "../../shared/ui";
import {
  tournamentService,
  type TournamentItem,
  type LeaderboardItem,
} from "../../services/tournament.service";
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
    { key: "referee_live", label: "Bàn Trọng Tài" },
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
      message.error(err?.response?.data?.message || err?.message || "Tạo giải đấu thất bại, vui lòng kiểm tra lại thông tin!");
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
      message.error(err?.response?.data?.message || err?.message || "Cập nhật giải đấu thất bại!");
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

      {(activeMainTab === "referee_live" || activeMainTab === "brackets") && (
        <div className="rounded-2xl bg-gradient-to-b from-[#064e3b] to-[#042f24] border-2 border-slate-800 p-8 sm:p-12 text-center text-white shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-300/30 text-amber-300 flex items-center justify-center mx-auto mb-3 text-2xl">
            {activeMainTab === "brackets" ? <TeamOutlined /> : <ThunderboltOutlined />}
          </div>
          <h4 className="text-white font-black text-base mb-1">
            {activeMainTab === "brackets" ? "Chưa có nhánh đấu" : "Chưa có trận đấu để chấm điểm"}
          </h4>
          <p className="text-emerald-100/75 text-xs max-w-md mx-auto leading-relaxed">
            Dữ liệu trận đấu chưa được lưu trong hệ thống nên chưa có gì để hiển thị. Màn này sẽ
            hiển thị khi backend cung cấp API tạo nhánh đấu và ghi nhận điểm từng trận.
          </p>
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

