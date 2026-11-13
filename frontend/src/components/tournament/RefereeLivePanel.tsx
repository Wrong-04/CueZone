import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MinusOutlined,
  PlusOutlined,
  TrophyOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, message, Modal } from "../../shared/ui";
import {
  tournamentService,
  type TournamentItem,
  type BracketStructure,
  type BracketMatch,
} from "../../services/tournament.service";
import { getSocket } from "../../services/socket.service";

interface RefereeLivePanelProps {
  tournaments: TournamentItem[];
  selectedTournamentId?: string;
  onSelectTournament?: (id: string) => void;
  onScoreUpdated?: () => void;
}

export const RefereeLivePanel: React.FC<RefereeLivePanelProps> = ({
  tournaments,
  selectedTournamentId,
  onSelectTournament,
  onScoreUpdated,
}) => {
  const [activeTourneyId, setActiveTourneyId] = useState<string>(
    selectedTournamentId || tournaments[0]?._id || "",
  );
  const [bracket, setBracket] = useState<BracketStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const selectedMatchRef = useRef<BracketMatch | null>(null);

  useEffect(() => {
    selectedMatchRef.current = selectedMatch;
  }, [selectedMatch]);
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [confirmCompleteModal, setConfirmCompleteModal] = useState<boolean>(false);
  const [walkover, setWalkover] = useState<boolean>(false);
  const [winnerRegistrationId, setWinnerRegistrationId] = useState<string>("");

  useEffect(() => {
    if (selectedTournamentId) {
      setActiveTourneyId(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  const pickMatch = useCallback((match: BracketMatch) => {
    setSelectedMatch(match);
    const p1 = match.participants.find((p) => p.slot === 1);
    const p2 = match.participants.find((p) => p.slot === 2);
    setScore1(p1?.score || 0);
    setScore2(p2?.score || 0);
    setWinnerRegistrationId(match.winnerRegistrationId || "");
  }, []);

  const fetchBracket = useCallback(async (tId: string, silent = false) => {
    if (!tId) return;
    if (!silent) setLoading(true);
    try {
      const data = await tournamentService.getBracket(tId);
      setBracket(data);
      if (data && data.rounds.length > 0) {
        const allMatches = data.rounds.flatMap((r) => r.matches);
        const currentSelected = selectedMatchRef.current;
        if (currentSelected) {
          const fresh = allMatches.find((m) => m._id === currentSelected._id);
          if (fresh) {
            setSelectedMatch(fresh);
            const p1 = fresh.participants.find((p) => p.slot === 1);
            const p2 = fresh.participants.find((p) => p.slot === 2);
            setScore1(p1?.score || 0);
            setScore2(p2?.score || 0);
            return;
          }
        }
        const activeMatch =
          allMatches.find((m) => m.status === "in_progress") ||
          allMatches.find((m) => m.status === "scheduled" && m.participants.length === 2) ||
          allMatches[0];
        if (activeMatch) {
          pickMatch(activeMatch);
        }
      }
    } catch {
      setBracket(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [pickMatch]);

  useEffect(() => {
    if (activeTourneyId) {
      void fetchBracket(activeTourneyId, false);
    }
  }, [activeTourneyId, fetchBracket]);

  const patchBracketMatchInState = useCallback(
    (
      matchId: string,
      delta: {
        score1?: number;
        score2?: number;
        status?: any;
        winnerRegistrationId?: string;
        nextMatchId?: string;
        nextMatchSlot?: 1 | 2;
        winnerUser?: any;
      },
    ) => {
      setBracket((prev) => {
        if (!prev) return null;
        const newRounds = prev.rounds.map((round) => {
          const newMatches = round.matches.map((m) => {
            if (m._id === matchId) {
              const updatedParticipants = m.participants.map((p) => {
                if (p.slot === 1 && delta.score1 !== undefined) {
                  return { ...p, score: delta.score1, isWinner: delta.winnerRegistrationId ? String(delta.winnerRegistrationId) === String(p.registrationId) : p.isWinner };
                }
                if (p.slot === 2 && delta.score2 !== undefined) {
                  return { ...p, score: delta.score2, isWinner: delta.winnerRegistrationId ? String(delta.winnerRegistrationId) === String(p.registrationId) : p.isWinner };
                }
                return p;
              });

              return {
                ...m,
                status: delta.status || m.status,
                winnerRegistrationId: delta.winnerRegistrationId || m.winnerRegistrationId,
                participants: updatedParticipants,
              };
            }

            // Nếu đây là trận tiếp theo được đôn người thắng vào
            if (delta.nextMatchId && m._id === delta.nextMatchId && delta.nextMatchSlot && delta.winnerUser) {
              const remaining = m.participants.filter((p) => p.slot !== delta.nextMatchSlot);
              const newParticipant: any = {
                slot: delta.nextMatchSlot,
                registrationId: delta.winnerRegistrationId,
                user: delta.winnerUser,
                score: 0,
                isWinner: null,
              };
              return {
                ...m,
                participants: [...remaining, newParticipant],
              };
            }

            return m;
          });

          return { ...round, matches: newMatches };
        });

        return { ...prev, rounds: newRounds };
      });
    },
    [],
  );

  useEffect(() => {
    const socket = getSocket();
    const handleScoreUpdated = (payload: any) => {
      if (payload?.tournamentId === activeTourneyId) {
        if (selectedMatchRef.current && selectedMatchRef.current._id === payload.matchId) {
          if (payload.score1 !== undefined) setScore1(payload.score1);
          if (payload.score2 !== undefined) setScore2(payload.score2);
        }
        patchBracketMatchInState(payload.matchId, payload);
        onScoreUpdated?.();
      }
    };

    const handleMatchCompleted = (payload: any) => {
      if (payload?.tournamentId === activeTourneyId) {
        patchBracketMatchInState(payload.matchId, payload);
        onScoreUpdated?.();
      }
    };

    socket.on("tournament:score_updated", handleScoreUpdated);
    socket.on("tournament:match_completed", handleMatchCompleted);

    return () => {
      socket.off("tournament:score_updated", handleScoreUpdated);
      socket.off("tournament:match_completed", handleMatchCompleted);
    };
  }, [activeTourneyId, patchBracketMatchInState, onScoreUpdated]);

  const handleUpdateScore = async (newScore1: number, newScore2: number) => {
    if (!selectedMatch) return;
    const oldScore1 = score1;
    const oldScore2 = score2;

    // Optimistic UI update
    setScore1(newScore1);
    setScore2(newScore2);
    patchBracketMatchInState(selectedMatch._id, {
      score1: newScore1,
      score2: newScore2,
      status: "in_progress",
    });

    setSaving(true);
    try {
      await tournamentService.updateMatchScore(selectedMatch._id, {
        score1: newScore1,
        score2: newScore2,
        status: "in_progress",
      });
      message.success("Đã ghi nhận điểm ván mới!");
      onScoreUpdated?.();
    } catch (err: any) {
      // Rollback nếu thất bại
      setScore1(oldScore1);
      setScore2(oldScore2);
      patchBracketMatchInState(selectedMatch._id, {
        score1: oldScore1,
        score2: oldScore2,
      });
      message.error(err?.message || "Không thể cập nhật điểm");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteMatch = async (winnerId: string) => {
    if (!selectedMatch || !winnerId) return;
    setSaving(true);
    try {
      await tournamentService.updateMatchScore(selectedMatch._id, {
        score1,
        score2,
        winnerRegistrationId: winnerId,
        status: walkover ? "walkover" : "completed",
      });
      message.success("Đã chốt kết quả trận đấu và đôn cơ thủ vào vòng tiếp theo!");
      setConfirmCompleteModal(false);
      void fetchBracket(activeTourneyId, true);
      onScoreUpdated?.();
    } catch (err: any) {
      message.error(err?.message || "Không thể chốt trận đấu");
    } finally {
      setSaving(false);
    }
  };

  const p1 = selectedMatch?.participants.find((p) => p.slot === 1);
  const p2 = selectedMatch?.participants.find((p) => p.slot === 2);
  // Race to theo vòng chứa trận (cùng nguồn với backend), không lấy raceToScore hiện tại của giải
  const raceTo =
    bracket?.rounds.find((r) => r.matches.some((m) => m._id === selectedMatch?._id))?.raceTo ||
    bracket?.tournament.raceToScore ||
    5;
  const isFinishedMatch =
    (selectedMatch?.status === "completed" || selectedMatch?.status === "walkover") &&
    Boolean(selectedMatch.winnerRegistrationId);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm font-semibold text-slate-300">Giải đấu:</span>
          <select
            className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm w-full sm:w-auto min-w-[240px]"
            value={activeTourneyId}
            onChange={(e) => {
              setActiveTourneyId(e.target.value);
              onSelectTournament?.(e.target.value);
            }}
          >
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.status})
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => void fetchBracket(activeTourneyId)}
          loading={loading}
          icon={<ReloadOutlined />}
          size="middle"
        >
          Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center text-slate-400">
          <span className="inline-block animate-spin mr-2">⚡</span> Đang tải bàn trọng tài...
        </div>
      ) : !bracket || bracket.rounds.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-b from-[#064e3b] to-[#042f24] border-2 border-slate-800 p-8 sm:p-12 text-center text-white shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-300/30 text-amber-300 flex items-center justify-center mx-auto mb-3 text-2xl">
            <ThunderboltOutlined />
          </div>
          <h4 className="text-white font-black text-base mb-1">Chưa có trận đấu</h4>
          <p className="text-emerald-100/75 text-xs max-w-md mx-auto leading-relaxed">
            Giải đấu chưa được sinh nhánh đấu. Vui lòng chuyển sang tab "Nhánh Đấu" để sinh nhánh trước.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[640px] overflow-y-auto">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
              Danh Sách Trận Đấu
            </h4>
            {bracket.rounds.map((round) => (
              <div key={round.round} className="space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-md">
                  {round.roundName} (Race to {round.raceTo})
                </div>
                <div className="space-y-1.5">
                  {round.matches.map((m) => {
                    const mp1 = m.participants.find((p) => p.slot === 1);
                    const mp2 = m.participants.find((p) => p.slot === 2);
                    const isSelected = selectedMatch?._id === m._id;
                    const isBye = m.status === "bye";
                    const isDone = m.status === "completed" || m.status === "walkover" || isBye;

                    return (
                      <div
                        key={m._id}
                        onClick={() => !isBye && pickMatch(m)}
                        className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                          isSelected
                            ? "bg-emerald-950/40 border-emerald-500 shadow-sm"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-300">{m.code}</span>
                          {isBye ? (
                            <span className="text-amber-400 font-bold">BYE</span>
                          ) : isDone ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircleOutlined /> Xong
                            </span>
                          ) : m.status === "in_progress" ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <ClockCircleOutlined /> Đang đấu
                            </span>
                          ) : (
                            <span className="text-slate-500">Chờ</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-slate-200">
                            <span className="truncate max-w-[130px] font-medium">
                              {mp1?.user?.name || "Chờ..."}
                            </span>
                            <span className="font-bold text-amber-400">{mp1?.score ?? 0}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-200">
                            <span className="truncate max-w-[130px] font-medium">
                              {mp2?.user?.name || "Chờ..."}
                            </span>
                            <span className="font-bold text-amber-400">{mp2?.score ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedMatch ? (
              <div className="bg-gradient-to-b from-[#064e3b] to-[#042f24] border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-xl text-white">
                <div className="flex items-center justify-between pb-4 border-b border-emerald-800/60 mb-6">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold block">
                      {selectedMatch.roundName} • Bàn Trọng Tài
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                      <ThunderboltOutlined className="text-amber-400" /> Trận {selectedMatch.code}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Chạm {raceTo} thắng (Race to {raceTo})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-8 my-6">
                  <div
                    className={`p-4 sm:p-6 rounded-2xl border text-center transition-all ${
                      selectedMatch.winnerRegistrationId &&
                      String(p1?.registrationId) === String(selectedMatch.winnerRegistrationId)
                        ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30"
                        : "bg-slate-950/70 border-emerald-700/50"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-700/60 text-emerald-200 font-black text-lg mx-auto flex items-center justify-center mb-2 border border-emerald-500/40">
                      {p1?.user?.name?.charAt(0) || "1"}
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white truncate mb-1">
                      {p1?.user?.name || "Cơ thủ 1 (Chờ)"}
                    </h4>
                    <p className="text-xs text-emerald-300/80 mb-4">
                      {p1?.seed ? `Hạt giống #${p1.seed}` : "Vị trí Slot 1"}
                    </p>

                    <div className="text-5xl sm:text-7xl font-black text-amber-400 font-mono tracking-tighter my-2 drop-shadow-md">
                      {score1}
                    </div>

                    {!isFinishedMatch && p1?.registrationId && (
                      <div className="flex items-center justify-center gap-4 mt-5">
                        <Button
                          disabled={score1 <= 0 || saving}
                          onClick={() => handleUpdateScore(Math.max(0, score1 - 1), score2)}
                          className="!w-12 !h-12 !rounded-2xl !p-0 !bg-slate-800 !text-slate-300 !border-slate-700 flex items-center justify-center hover:!bg-slate-700 text-lg shadow-sm"
                          title="Trừ 1 điểm"
                        >
                          <MinusOutlined />
                        </Button>
                        <Button
                          disabled={score1 >= raceTo || saving}
                          onClick={() => handleUpdateScore(score1 + 1, score2)}
                          className="!w-16 !h-16 !rounded-2xl !p-0 !bg-emerald-500 !text-slate-950 !border-none font-black text-2xl flex items-center justify-center hover:!bg-emerald-400 shadow-xl ring-2 ring-emerald-400/40 active:scale-95 transition-all"
                          title="Cộng 1 điểm"
                        >
                          <PlusOutlined />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div
                    className={`p-4 sm:p-6 rounded-2xl border text-center transition-all ${
                      selectedMatch.winnerRegistrationId &&
                      String(p2?.registrationId) === String(selectedMatch.winnerRegistrationId)
                        ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30"
                        : "bg-slate-950/70 border-emerald-700/50"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-700/60 text-emerald-200 font-black text-lg mx-auto flex items-center justify-center mb-2 border border-emerald-500/40">
                      {p2?.user?.name?.charAt(0) || "2"}
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white truncate mb-1">
                      {p2?.user?.name || "Cơ thủ 2 (Chờ)"}
                    </h4>
                    <p className="text-xs text-emerald-300/80 mb-4">
                      {p2?.seed ? `Hạt giống #${p2.seed}` : "Vị trí Slot 2"}
                    </p>

                    <div className="text-5xl sm:text-7xl font-black text-amber-400 font-mono tracking-tighter my-2 drop-shadow-md">
                      {score2}
                    </div>

                    {!isFinishedMatch && p2?.registrationId && (
                      <div className="flex items-center justify-center gap-4 mt-5">
                        <Button
                          disabled={score2 <= 0 || saving}
                          onClick={() => handleUpdateScore(score1, Math.max(0, score2 - 1))}
                          className="!w-12 !h-12 !rounded-2xl !p-0 !bg-slate-800 !text-slate-300 !border-slate-700 flex items-center justify-center hover:!bg-slate-700 text-lg shadow-sm"
                          title="Trừ 1 điểm"
                        >
                          <MinusOutlined />
                        </Button>
                        <Button
                          disabled={score2 >= raceTo || saving}
                          onClick={() => handleUpdateScore(score1, score2 + 1)}
                          className="!w-16 !h-16 !rounded-2xl !p-0 !bg-emerald-500 !text-slate-950 !border-none font-black text-2xl flex items-center justify-center hover:!bg-emerald-400 shadow-xl ring-2 ring-emerald-400/40 active:scale-95 transition-all"
                          title="Cộng 1 điểm"
                        >
                          <PlusOutlined />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {!isFinishedMatch && p1?.registrationId && p2?.registrationId && (
                  <div className="mt-8 pt-6 border-t border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-emerald-200/80">
                      Cơ thủ đạt {raceTo} điểm trước sẽ giành chiến thắng chung cuộc.
                    </div>
                    <Button
                      type="primary"
                      onClick={() => {
                        // Mặc định theo bên điểm cao hơn; hòa điểm thì để trống cho trọng tài chọn
                        const defaultWinner =
                          score1 > score2 ? p1.registrationId : score2 > score1 ? p2.registrationId : "";
                        setWinnerRegistrationId(defaultWinner || "");
                        setWalkover(score1 < raceTo && score2 < raceTo);
                        setConfirmCompleteModal(true);
                      }}
                      className="!bg-amber-400 hover:!bg-amber-300 !text-slate-950 font-bold px-6 h-10 shadow-lg"
                      icon={<TrophyOutlined />}
                    >
                      Chốt Kết Quả Trận Đấu
                    </Button>
                  </div>
                )}

                {isFinishedMatch && (
                  <div className="mt-6 p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 text-center">
                    <span className="text-amber-300 font-bold text-sm flex items-center justify-center gap-2">
                      <TrophyOutlined className="text-lg" /> Trận đấu đã hoàn tất! Người thắng đã được đôn
                      vào nhánh đấu tiếp theo.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                Chọn một trận đấu từ danh sách bên trái để mở bàn chấm điểm.
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={confirmCompleteModal}
        onCancel={() => setConfirmCompleteModal(false)}
        footer={null}
        title="Xác nhận kết quả trận đấu"
        className="!text-slate-100"
      >
        <div className="py-4 space-y-4">
          <p className="text-slate-300 text-sm">
            Chọn người chiến thắng chính thức của trận đấu này để tự động đôn vào nhánh tiếp theo và tính điểm ELO:
          </p>

          <div className="space-y-2">
            {p1 && (
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                  winnerRegistrationId === p1.registrationId
                    ? "bg-emerald-950/60 border-emerald-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="winnerRadio"
                    checked={winnerRegistrationId === p1.registrationId}
                    onChange={() => setWinnerRegistrationId(p1.registrationId || "")}
                  />
                  <span className="font-bold">{p1.user?.name} (Slot 1)</span>
                </div>
                <span className="font-mono font-bold text-amber-400">{score1} điểm</span>
              </label>
            )}

            {p2 && (
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                  winnerRegistrationId === p2.registrationId
                    ? "bg-emerald-950/60 border-emerald-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="winnerRadio"
                    checked={winnerRegistrationId === p2.registrationId}
                    onChange={() => setWinnerRegistrationId(p2.registrationId || "")}
                  />
                  <span className="font-bold">{p2.user?.name} (Slot 2)</span>
                </div>
                <span className="font-mono font-bold text-amber-400">{score2} điểm</span>
              </label>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={walkover} onChange={(e) => setWalkover(e.target.checked)} />
            Thắng do đối thủ bỏ cuộc (không tính ELO)
          </label>
          {!walkover && (score1 >= raceTo) === (score2 >= raceTo) && (
            <p className="text-xs text-amber-400">
              Chốt thường cần đúng một cơ thủ đạt {raceTo} điểm. Nếu trận kết thúc sớm, hãy chọn bỏ cuộc.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button onClick={() => setConfirmCompleteModal(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={saving}
              disabled={!winnerRegistrationId}
              onClick={() => handleCompleteMatch(winnerRegistrationId)}
              className="!bg-emerald-600 hover:!bg-emerald-500 font-bold"
            >
              Xác Nhận & Thăng Hạng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
