import React, { useState, useEffect } from "react";
import {
  TrophyOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Typography,
  message,
  Modal,
} from "../../shared/ui";
import {
  INITIAL_TOURNAMENT_MATCH,
  type TournamentMatchScore,
} from "../../mock/posData";

const { Title, Text } = Typography;

export const RefereeScoringPage: React.FC = () => {
  const [match, setMatch] = useState<TournamentMatchScore>(() => {
    const saved = localStorage.getItem("cuezone_referee_match");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TOURNAMENT_MATCH;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_referee_match", JSON.stringify(match));
  }, [match]);

  // Result modal
  const [finishModalVisible, setFinishModalVisible] = useState<boolean>(false);
  const [winnerPlayerId, setWinnerPlayerId] = useState<string>("");

  // Scoring handlers (Update Match Scores)
  const handleAddPoint = (playerIndex: 1 | 2) => {
    if (match.status === "finished") {
      message.warning("Trận đấu đã kết thúc!");
      return;
    }

    setMatch((prev) => {
      const nextMatch = { ...prev };
      if (playerIndex === 1) {
        const nextScore = nextMatch.player1.score + 1;
        nextMatch.player1 = {
          ...nextMatch.player1,
          score: nextScore,
          bankShots: nextMatch.player1.bankShots + 1,
        };
        if (nextScore >= nextMatch.raceTo) {
          nextMatch.status = "finished";
          nextMatch.winnerId = nextMatch.player1.id;
          setWinnerPlayerId(nextMatch.player1.id);
          setFinishModalVisible(true);
        }
      } else {
        const nextScore = nextMatch.player2.score + 1;
        nextMatch.player2 = {
          ...nextMatch.player2,
          score: nextScore,
          bankShots: nextMatch.player2.bankShots + 1,
        };
        if (nextScore >= nextMatch.raceTo) {
          nextMatch.status = "finished";
          nextMatch.winnerId = nextMatch.player2.id;
          setWinnerPlayerId(nextMatch.player2.id);
          setFinishModalVisible(true);
        }
      }
      return nextMatch;
    });

    const playerName = playerIndex === 1 ? match.player1.name : match.player2.name;
    message.success(`+1 Ván thắng cho cơ thủ ${playerName}!`);
  };

  const handleAddFoul = (playerIndex: 1 | 2) => {
    if (match.status === "finished") return;

    setMatch((prev) => {
      const nextMatch = { ...prev };
      if (playerIndex === 1) {
        nextMatch.player1 = {
          ...nextMatch.player1,
          fouls: nextMatch.player1.fouls + 1,
        };
      } else {
        nextMatch.player2 = {
          ...nextMatch.player2,
          fouls: nextMatch.player2.fouls + 1,
        };
      }
      // Auto switch turn on foul
      nextMatch.activePlayerTurn = playerIndex === 1 ? 2 : 1;
      return nextMatch;
    });

    const playerName = playerIndex === 1 ? match.player1.name : match.player2.name;
    message.warning(`Ghi nhận phạm quy (Foul) cho ${playerName} • Chuyển quyền đánh bi trong tay!`);
  };

  const handleSwitchTurn = () => {
    setMatch((prev) => ({
      ...prev,
      activePlayerTurn: prev.activePlayerTurn === 1 ? 2 : 1,
    }));
    message.info("Đã chuyển lượt cơ thủ đánh!");
  };

  // Reset / New Match
  const handleResetMatch = () => {
    setMatch({
      ...INITIAL_TOURNAMENT_MATCH,
      currentRack: 1,
      player1: { ...INITIAL_TOURNAMENT_MATCH.player1, score: 0, fouls: 0, bankShots: 0 },
      player2: { ...INITIAL_TOURNAMENT_MATCH.player2, score: 0, fouls: 0, bankShots: 0 },
      status: "in_progress",
      winnerId: undefined,
    });
    setFinishModalVisible(false);
    message.info("Đã thiết lập lại trận đấu mới!");
  };

  const isPlayer1Active = match.activePlayerTurn === 1;
  const isPlayer2Active = match.activePlayerTurn === 2;
  const isFinished = match.status === "finished";

  return (
    <div className="space-y-6">
      {/* ── HEADER & MATCH CONTEXT ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrophyOutlined className="text-amber-500 text-xl" />
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Bảng Điểm Trọng Tài Bank Pool
              </Title>
              <Tag color="gold" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                REFEREE SCORING
              </Tag>
            </div>
            <Text className="!text-xs !text-slate-500">
              Chấm điểm ván đấu, ghi nhận bi ăn băng hợp lệ, lỗi phạm quy và cập nhật kết quả ELO giải đấu
            </Text>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetMatch}
              className="!text-xs !rounded-xl !border-slate-300"
            >
              Thiết Lập Trận Mới
            </Button>
          </div>
        </div>

        {/* Match info pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Giải đấu: <strong className="text-slate-900">{match.tournamentName}</strong>
            </span>
            <span>
              Bàn đấu: <strong className="text-emerald-700">{match.tableName}</strong>
            </span>
            <span>
              Trọng tài bàn: <strong>{match.refereeName}</strong>
            </span>
          </div>

          <div>
            Thể thức: <strong className="text-slate-900 font-mono">Race to {match.raceTo} (Chạm {match.raceTo})</strong>
          </div>
        </div>
      </div>

      {/* ── BẢNG TỈ SỐ ĐIỆN TỬ TRỰC TIẾP (DIGITAL SCOREBOARD) ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* CƠ THỦ 1 (5 cols) */}
        <div
          className={`md:col-span-5 rounded-2xl border p-6 flex flex-col justify-between transition-all shadow-xs ${
            isPlayer1Active
              ? "bg-emerald-50/40 border-emerald-500 ring-4 ring-emerald-500/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            {/* Player badge & Turn indicator */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cơ Thủ 1</span>
              {isPlayer1Active ? (
                <Tag color="green" className="!rounded-full !px-3 !py-1 !text-xs !font-bold animate-pulse">
                  ĐANG ĐẾN LƯỢT ĐÁNH
                </Tag>
              ) : (
                <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !bg-slate-100">
                  CHỜ LƯỢT
                </Tag>
              )}
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3.5 mb-6">
              <img
                src={match.player1.avatar}
                alt={match.player1.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-sm"
              />
              <div>
                <Title level={3} className="!text-lg !font-black !text-slate-900 !mb-0">
                  {match.player1.name}
                </Title>
                <div className="flex items-center gap-2 mt-1">
                  <Tag color="cyan" className="!text-[10px] !font-bold !px-2 !py-0 !rounded-md">
                    {match.player1.rank}
                  </Tag>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    ELO {match.player1.elo}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Big Display */}
            <div className="py-6 px-4 rounded-2xl bg-slate-900 text-white text-center mb-6 shadow-inner font-mono">
              <span className="text-[11px] uppercase tracking-widest text-slate-400 block mb-1">
                SỐ VÁN THẮNG
              </span>
              <span className="text-6xl font-black text-emerald-400">
                {match.player1.score}
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                / {match.raceTo} ván
              </span>
            </div>

            {/* Sub stats */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-6">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Bi ăn băng hợp lệ</span>
                <span className="text-base font-bold text-slate-900">{match.player1.bankShots} bi</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[11px] text-rose-700 block">Lỗi phạm quy</span>
                <span className="text-base font-bold text-rose-800">{match.player1.fouls} lần</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <Button
              variant="primary"
              size="lg"
              disabled={isFinished}
              onClick={() => handleAddPoint(1)}
              leftIcon={<ThunderboltOutlined />}
              className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-sm !h-12 shadow-sm"
            >
              +1 Thắng Ván Đấu (Rack)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isFinished}
              onClick={() => handleAddFoul(1)}
              leftIcon={<CloseCircleOutlined />}
              className="!w-full !rounded-xl !border-rose-300 !text-rose-700 hover:!bg-rose-50 font-bold text-xs !h-9"
            >
              Báo Lỗi Phạm Quy (Foul)
            </Button>
          </div>
        </div>

        {/* TRUNG TÂM: VS & ĐIỀU KHIỂN CHUYỂN LƯỢT (2 cols) */}
        <div className="md:col-span-2 flex flex-col items-center justify-center gap-4 py-6">
          <div className="h-16 w-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">
            VS
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isFinished}
            onClick={handleSwitchTurn}
            leftIcon={<SwapOutlined />}
            className="!rounded-xl !border-slate-300 !bg-white !text-slate-800 font-bold !text-xs !h-10 !px-4 shadow-xs"
          >
            Đổi Lượt Đánh
          </Button>

          {isFinished && (
            <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <span className="font-bold block">Trận đấu đã kết thúc!</span>
              <span>Người thắng: {match.winnerId === "P1" ? match.player1.name : match.player2.name}</span>
            </div>
          )}
        </div>

        {/* CƠ THỦ 2 (5 cols) */}
        <div
          className={`md:col-span-5 rounded-2xl border p-6 flex flex-col justify-between transition-all shadow-xs ${
            isPlayer2Active
              ? "bg-emerald-50/40 border-emerald-500 ring-4 ring-emerald-500/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            {/* Player badge & Turn indicator */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cơ Thủ 2</span>
              {isPlayer2Active ? (
                <Tag color="green" className="!rounded-full !px-3 !py-1 !text-xs !font-bold animate-pulse">
                  ĐANG ĐẾN LƯỢT ĐÁNH
                </Tag>
              ) : (
                <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !bg-slate-100">
                  CHỜ LƯỢT
                </Tag>
              )}
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3.5 mb-6">
              <img
                src={match.player2.avatar}
                alt={match.player2.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-sm"
              />
              <div>
                <Title level={3} className="!text-lg !font-black !text-slate-900 !mb-0">
                  {match.player2.name}
                </Title>
                <div className="flex items-center gap-2 mt-1">
                  <Tag color="blue" className="!text-[10px] !font-bold !px-2 !py-0 !rounded-md">
                    {match.player2.rank}
                  </Tag>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    ELO {match.player2.elo}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Big Display */}
            <div className="py-6 px-4 rounded-2xl bg-slate-900 text-white text-center mb-6 shadow-inner font-mono">
              <span className="text-[11px] uppercase tracking-widest text-slate-400 block mb-1">
                SỐ VÁN THẮNG
              </span>
              <span className="text-6xl font-black text-emerald-400">
                {match.player2.score}
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                / {match.raceTo} ván
              </span>
            </div>

            {/* Sub stats */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-6">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Bi ăn băng hợp lệ</span>
                <span className="text-base font-bold text-slate-900">{match.player2.bankShots} bi</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[11px] text-rose-700 block">Lỗi phạm quy</span>
                <span className="text-base font-bold text-rose-800">{match.player2.fouls} lần</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <Button
              variant="primary"
              size="lg"
              disabled={isFinished}
              onClick={() => handleAddPoint(2)}
              leftIcon={<ThunderboltOutlined />}
              className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-sm !h-12 shadow-sm"
            >
              +1 Thắng Ván Đấu (Rack)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isFinished}
              onClick={() => handleAddFoul(2)}
              leftIcon={<CloseCircleOutlined />}
              className="!w-full !rounded-xl !border-rose-300 !text-rose-700 hover:!bg-rose-50 font-bold text-xs !h-9"
            >
              Báo Lỗi Phạm Quy (Foul)
            </Button>
          </div>
        </div>
      </div>

      {/* ── MODAL: CẬP NHẬT KẾT QUẢ TRẬN ĐẤU (Update Match Result) ─────────── */}
      <Modal
        open={finishModalVisible}
        onCancel={() => setFinishModalVisible(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-amber-500">
            <TrophyOutlined className="text-xl" />
            <span className="font-bold text-slate-900 text-base">
              Xác Nhận & Cập Nhật Kết Quả Trận Đấu
            </span>
          </div>
        }
      >
        <div className="py-3 space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
            <TrophyOutlined className="text-4xl text-amber-500" />
            <div className="font-black text-base text-amber-950">
              Chúc Mừng: {winnerPlayerId === "P1" ? match.player1.name : match.player2.name}!
            </div>
            <div className="text-xs text-amber-800">
              Đã giành chiến thắng chung cuộc với tỉ số:{" "}
              <strong>
                {match.player1.score} - {match.player2.score}
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-slate-700">
            <div className="font-bold text-slate-900 mb-1">Cập nhật chỉ số ELO dự kiến:</div>
            <div className="flex justify-between">
              <span>{match.player1.name} (P1):</span>
              <strong className={winnerPlayerId === "P1" ? "text-emerald-700 font-bold" : "text-rose-600"}>
                {winnerPlayerId === "P1" ? "+25 ELO (Mới: 1,875)" : "-15 ELO (Mới: 1,835)"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>{match.player2.name} (P2):</span>
              <strong className={winnerPlayerId === "P2" ? "text-emerald-700 font-bold" : "text-rose-600"}>
                {winnerPlayerId === "P2" ? "+25 ELO (Mới: 1,845)" : "-15 ELO (Mới: 1,805)"}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFinishModalVisible(false)}
              className="!rounded-xl"
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFinishModalVisible(false);
                message.success("Đã lưu kết quả trận đấu và đồng bộ bảng xếp hạng ELO giải đấu!");
              }}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Lưu & Đồng Bộ Bảng Đấu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RefereeScoringPage;
