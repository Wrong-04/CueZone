import React, { useState } from "react";
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Modal, Button, message } from "../../shared/ui";
import {
  type BracketMatch,
  type BracketStructure,
  tournamentService,
} from "../../services/tournament.service";

interface InteractiveBracketTreeProps {
  bracket: BracketStructure;
  readOnly?: boolean;
  onRefresh?: () => void;
}

export const InteractiveBracketTree: React.FC<InteractiveBracketTreeProps> = ({
  bracket,
  readOnly = false,
  onRefresh,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);
  const [walkover, setWalkover] = useState<boolean>(false);

  const openScoreModal = (match: BracketMatch) => {
    if (readOnly || match.status === "bye") return;
    const p1 = match.participants.find((p) => p.slot === 1);
    const p2 = match.participants.find((p) => p.slot === 2);
    if (!p1?.registrationId || !p2?.registrationId) {
      message.info("Trận đấu đang chờ xác định đủ 2 cơ thủ từ các vòng trước");
      return;
    }
    setSelectedMatch(match);
    setScore1(p1?.score || 0);
    setScore2(p2?.score || 0);
    setSelectedWinnerId(match.winnerRegistrationId || "");
    setWalkover(match.status === "walkover");
  };

  const handleSaveScore = async () => {
    if (!selectedMatch) return;
    setUpdating(true);
    try {
      await tournamentService.updateMatchScore(selectedMatch._id, {
        score1: Number(score1),
        score2: Number(score2),
        winnerRegistrationId: selectedWinnerId || undefined,
        status: selectedWinnerId ? (walkover ? "walkover" : "completed") : "in_progress",
      });
      message.success("Đã cập nhật tỷ số trận đấu!");
      setSelectedMatch(null);
      onRefresh?.();
    } catch (err: any) {
      message.error(err?.message || "Không thể cập nhật tỷ số");
    } finally {
      setUpdating(false);
    }
  };

  // Trận completed cũ thiếu người thắng vẫn cho chốt lại
  const isFinished =
    (selectedMatch?.status === "completed" || selectedMatch?.status === "walkover") &&
    Boolean(selectedMatch.winnerRegistrationId);
  const selectedRaceTo = bracket.rounds.find((r) => r.matches.some((m) => m._id === selectedMatch?._id))?.raceTo;

  return (
    <div className="w-full overflow-x-auto pb-6 select-none">
      <div className="min-w-[760px] flex items-start gap-8 sm:gap-12 py-4 px-2">
        {bracket.rounds.map((round) => (
          <div key={round.round} className="flex-1 min-w-[220px] max-w-[280px] flex flex-col">
            <div className="text-center mb-6 bg-slate-900/90 border border-slate-800 py-2.5 px-3 rounded-xl shadow-sm">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 block">
                {round.roundName}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Race to {round.raceTo} • {round.matches.length} trận
              </span>
            </div>

            <div
              className="flex flex-col justify-around flex-1 gap-6"
              style={{
                minHeight: `${Math.max((bracket.rounds[0]?.matches?.length || 1) * 90, 360)}px`,
              }}
            >
              {round.matches.map((match) => {
                const p1 = match.participants.find((p) => p.slot === 1);
                const p2 = match.participants.find((p) => p.slot === 2);
                const isBye = match.status === "bye";
                const isCompleted = match.status === "completed" || match.status === "walkover" || isBye;

                return (
                  <div
                    key={match._id}
                    onClick={() => openScoreModal(match)}
                    className={`relative rounded-xl border transition-all duration-200 overflow-hidden shadow-sm ${
                      !readOnly && !isBye
                        ? "cursor-pointer hover:border-emerald-500 hover:shadow-emerald-950/30"
                        : "cursor-default"
                    } ${
                      isCompleted
                        ? "bg-slate-900/90 border-slate-800"
                        : "bg-slate-950/80 border-slate-800/80"
                    }`}
                  >
                    <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <ThunderboltOutlined className="text-amber-400 text-[10px]" /> {match.code}
                      </span>
                      {isBye ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                          BYE
                        </span>
                      ) : isCompleted ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircleOutlined /> {match.status === "walkover" ? "Bỏ cuộc" : "Xong"}
                        </span>
                      ) : match.status === "in_progress" ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <ClockCircleOutlined /> Đang đấu
                        </span>
                      ) : (
                        <span className="text-slate-500">Chờ</span>
                      )}
                    </div>

                    <div className="p-2 space-y-1.5">
                      <div
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                          p1?.isWinner
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold"
                            : p1
                            ? "bg-slate-800/60 text-slate-200 font-medium"
                            : "bg-slate-900/40 text-slate-500 italic"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {p1?.seed && (
                            <span className="w-4 h-4 rounded-full bg-slate-700/80 text-[10px] text-amber-300 flex items-center justify-center font-bold flex-shrink-0">
                              {p1.seed}
                            </span>
                          )}
                          <span className="truncate">{p1?.user?.name || "TBD"}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                            p1?.isWinner
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {p1 ? p1.score : "-"}
                        </span>
                      </div>

                      <div
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                          p2?.isWinner
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold"
                            : p2
                            ? "bg-slate-800/60 text-slate-200 font-medium"
                            : "bg-slate-900/40 text-slate-500 italic"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {p2?.seed && (
                            <span className="w-4 h-4 rounded-full bg-slate-700/80 text-[10px] text-amber-300 flex items-center justify-center font-bold flex-shrink-0">
                              {p2.seed}
                            </span>
                          )}
                          <span className="truncate">
                            {isBye && !p2 ? "Miễn đấu (BYE)" : p2?.user?.name || "TBD"}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                            p2?.isWinner
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {p2 ? p2.score : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal
        title={`Chấm điểm trận: ${selectedMatch?.code || ""}`}
        open={Boolean(selectedMatch)}
        onCancel={() => setSelectedMatch(null)}
        footer={[
          <Button key="back" onClick={() => setSelectedMatch(null)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={updating}
            onClick={handleSaveScore}
            className="!bg-emerald-600 hover:!bg-emerald-500"
          >
            Lưu kết quả
          </Button>,
        ]}
      >
        {selectedMatch && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-400">
              {isFinished
                ? "Trận đã chốt: chỉ sửa được tỉ số, không đổi được người thắng."
                : `Cập nhật điểm số hai cơ thủ. Chọn cơ thủ thắng (đạt ${selectedRaceTo ?? "Race to"} điểm trước) để tự động đưa vào nhánh đấu vòng tiếp theo.`}
            </p>

            <div className="space-y-3">
              {selectedMatch.participants.map((p) => {
                const isSelectedWinner = selectedWinnerId === p.registrationId;
                return (
                  <div
                    key={p.slot}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isSelectedWinner
                        ? "bg-emerald-950/30 border-emerald-500/50"
                        : "bg-slate-900/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] font-bold text-amber-400 flex items-center justify-center">
                        {p.slot}
                      </span>
                      <div>
                        <span className="font-semibold text-sm text-slate-200 block">
                          {p.user?.name || `Cơ thủ slot ${p.slot}`}
                        </span>
                        {p.seed && (
                          <span className="text-[11px] text-amber-400">Hạt giống #{p.seed}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max={selectedRaceTo}
                        value={p.slot === 1 ? score1 : score2}
                        onChange={(e) =>
                          p.slot === 1
                            ? setScore1(Number(e.target.value))
                            : setScore2(Number(e.target.value))
                        }
                        className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-white font-bold"
                      />

                      <Button
                        size="small"
                        type={isSelectedWinner ? "primary" : "default"}
                        className={
                          isSelectedWinner
                            ? "!bg-emerald-600 !border-emerald-500"
                            : "!border-slate-700 !text-slate-300"
                        }
                        disabled={isFinished}
                        onClick={() => setSelectedWinnerId(p.registrationId || "")}
                      >
                        {isSelectedWinner ? "Thắng cuộc" : "Chọn thắng"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!isFinished && selectedWinnerId && (
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={walkover} onChange={(e) => setWalkover(e.target.checked)} />
                Thắng do đối thủ bỏ cuộc (không tính ELO)
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
