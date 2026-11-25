import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, Button, message, Select } from "../../shared/ui";
import {
  tournamentService,
  type BracketStructure,
  type TournamentItem,
} from "../../services/tournament.service";
import { EmptyMatchState, FaultPanel, MatchList, ScoreBoard } from "./referee/RefereePanels";
import {
  ACTIVE_STATUSES,
  EXTRA_TIME_SECONDS,
  SHOT_CLOCK_SECONDS,
  getPlayerName,
  type FaultEntry,
  type FaultType,
  type MatchEntry,
  type Slot,
} from "./referee/types";

const RefereePage = () => {
  /* 1. State hooks */
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [tournamentId, setTournamentId] = useState<string>();
  const [bracket, setBracket] = useState<BracketStructure | null>(null);
  const [selected, setSelected] = useState<MatchEntry | null>(null);
  const [scores, setScores] = useState<Record<Slot, number>>({ 1: 0, 2: 0 });
  const [currentSlot, setCurrentSlot] = useState<Slot>(1);
  const [secondsLeft, setSecondsLeft] = useState(SHOT_CLOCK_SECONDS);
  const [clockRunning, setClockRunning] = useState(false);
  const [faults, setFaults] = useState<FaultEntry[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const faultIdRef = useRef(0);

  /* 2. Derived state */
  const matches = useMemo<MatchEntry[]>(() => {
    if (!bracket) return [];

    return bracket.rounds.flatMap((round) =>
      round.matches
        .filter((m) => m.status !== "bye")
        .map((match) => ({ match, roundName: round.roundName, raceTo: round.raceTo })),
    );
  }, [bracket]);

  const currentPlayerName = getPlayerName(selected?.match, currentSlot);
  const clockExpired = secondsLeft <= 0;

  /* 3. Event handlers */
  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    try {
      const data = await tournamentService.getTournaments({ limit: 50 });
      const active = (data.items || []).filter((t) => ACTIVE_STATUSES.includes(t.status));
      setTournaments(active);
      setTournamentId((prev) => prev || active[0]?._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách giải đấu");
    } finally {
      setLoadingTournaments(false);
    }
  }, []);

  const loadBracket = useCallback(async (id: string) => {
    setLoadingBracket(true);
    setError("");
    try {
      setBracket(await tournamentService.getBracket(id));
    } catch (err) {
      setBracket(null);
      setError(err instanceof Error ? err.message : "Không thể tải danh sách trận đấu");
    } finally {
      setLoadingBracket(false);
    }
  }, []);

  const handleSelectMatch = (entry: MatchEntry) => {
    setSelected(entry);
    setScores({
      1: entry.match.participants.find((p) => p.slot === 1)?.score || 0,
      2: entry.match.participants.find((p) => p.slot === 2)?.score || 0,
    });
    setCurrentSlot(1);
    setSecondsLeft(SHOT_CLOCK_SECONDS);
    setClockRunning(entry.match.status === "in_progress");
    setFaults([]);
  };

  // ponytail: lỗi chỉ nằm trong state trang; thêm schema/API riêng khi cần lưu lịch sử lỗi.
  const recordFault = useCallback(
    (type: FaultType) => {
      faultIdRef.current += 1;
      setFaults((prev) => [
        ...prev,
        {
          id: faultIdRef.current,
          type,
          playerName: getPlayerName(selected?.match, currentSlot),
          at: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
      ]);
    },
    [currentSlot, selected],
  );

  const addExtraTime = () => {
    setSecondsLeft((s) => s + EXTRA_TIME_SECONDS);
    setClockRunning(true);
  };

  const handleNextTurn = () => {
    setCurrentSlot((slot) => (slot === 1 ? 2 : 1));
    setSecondsLeft(SHOT_CLOCK_SECONDS);
    setClockRunning(selected ? Math.max(scores[1], scores[2]) < selected.raceTo : false);
  };

  const handleAwardPoint = (slot: Slot) => {
    const nextScore = scores[slot] + 1;
    setScores((prev) => ({ ...prev, [slot]: nextScore }));
    setCurrentSlot(slot === 1 ? 2 : 1);
    setSecondsLeft(SHOT_CLOCK_SECONDS);
    setClockRunning(nextScore < (selected?.raceTo ?? Infinity));
  };

  const handleSaveResult = async () => {
    if (!selected || !tournamentId) return;
    setSaving(true);
    try {
      const winnerRegistrationId =
        scores[1] >= selected.raceTo
          ? selected.match.participants.find((p) => p.slot === 1)?.registrationId
          : scores[2] >= selected.raceTo
            ? selected.match.participants.find((p) => p.slot === 2)?.registrationId
            : undefined;
      await tournamentService.updateMatchScore(selected.match._id, {
        score1: scores[1],
        score2: scores[2],
        winnerRegistrationId,
        status: winnerRegistrationId ? "completed" : "in_progress",
      });
      message.success("Đã lưu kết quả trận đấu");
      setClockRunning(false);
      await loadBracket(tournamentId);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thể lưu kết quả trận đấu");
    } finally {
      setSaving(false);
    }
  };

  /* 4. Effects */
  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (!tournamentId) return;
    setSelected(null);
    setFaults([]);
    setClockRunning(false);
    void loadBracket(tournamentId);
  }, [tournamentId, loadBracket]);

  // ponytail: đồng hồ chạy trên client theo từng lượt; đồng bộ đa thiết bị cần thêm socket.
  useEffect(() => {
    if (!selected || !clockRunning || clockExpired) return;
    const timer = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [selected, clockRunning, clockExpired]);

  useEffect(() => {
    if (!selected || !clockRunning || !clockExpired) return;
    recordFault("Quá giờ");
    setClockRunning(false);
  }, [selected, clockRunning, clockExpired, recordFault]);

  /* 5. Render */
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Bàn Trọng Tài</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chấm điểm trận đấu, theo dõi đồng hồ 48 giây và ghi lỗi của từng cơ thủ.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Giải đấu:</span>
        <Select
          className="min-w-[260px]"
          value={tournamentId}
          loading={loadingTournaments}
          placeholder={tournaments.length ? "Chọn giải đấu" : "Chưa có giải đấu đang diễn ra"}
          onChange={(value) => setTournamentId(value)}
          options={tournaments.map((t) => ({ value: t._id, label: t.name }))}
        />
        <Button
          size="small"
          variant="outline"
          className="whitespace-nowrap"
          onClick={() => void loadTournaments()}
        >
          Tải lại
        </Button>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-4 items-start">
        <MatchList
          matches={matches}
          selectedId={selected?.match._id}
          loading={loadingBracket}
          onSelect={handleSelectMatch}
        />
        {selected ? (
          <div className="space-y-4">
            <ScoreBoard
              selected={selected}
              scores={scores}
              currentSlot={currentSlot}
              secondsLeft={secondsLeft}
              saving={saving}
              onAwardPoint={handleAwardPoint}
              onAddExtraTime={addExtraTime}
              onNextTurn={handleNextTurn}
              onSave={() => void handleSaveResult()}
            />
            <FaultPanel
              faults={faults}
              currentPlayerName={currentPlayerName}
              onRecordFault={recordFault}
            />
          </div>
        ) : (
          <EmptyMatchState />
        )}
      </div>
    </div>
  );
};

export default RefereePage;
