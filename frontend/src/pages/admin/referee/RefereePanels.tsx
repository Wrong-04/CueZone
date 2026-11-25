import { ClockCircleOutlined, StopOutlined, TrophyOutlined } from "@ant-design/icons";

import { Button, Spin, Tag } from "../../../shared/ui";
import {
  FAULT_TYPES,
  formatClock,
  getPlayerName,
  type FaultEntry,
  type FaultType,
  type MatchEntry,
  type Slot,
} from "./types";

interface MatchListProps {
  matches: MatchEntry[];
  selectedId?: string;
  loading: boolean;
  onSelect: (entry: MatchEntry) => void;
}

export const MatchList = ({ matches, selectedId, loading, onSelect }: MatchListProps) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
    <h2 className="text-sm font-bold text-navy-800 px-1 pb-3 whitespace-nowrap">
      Danh sách trận ({matches.length})
    </h2>
    {loading ? (
      <div className="py-10 text-center">
        <Spin />
      </div>
    ) : matches.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-10 px-2">
        Chưa có trận đấu nào cho giải này.
      </p>
    ) : (
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
        {matches.map((entry) => {
          const isActive = selectedId === entry.match._id;
          const isDone = entry.match.status === "completed" || entry.match.status === "walkover";

          return (
            <button
              key={entry.match._id}
              type="button"
              onClick={() => onSelect(entry)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                isActive
                  ? "border-brand bg-primary-50"
                  : "border-gray-200 hover:border-brand hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                  {entry.match.code}
                </span>
                <Tag color={isDone ? "default" : "processing"} className="!mr-0 whitespace-nowrap">
                  {entry.roundName}
                </Tag>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-navy-800 truncate">
                  {getPlayerName(entry.match, 1)}
                </span>
                <span className="font-bold text-gray-700 whitespace-nowrap">
                  {entry.match.participants.find((p) => p.slot === 1)?.score ?? 0} :{" "}
                  {entry.match.participants.find((p) => p.slot === 2)?.score ?? 0}
                </span>
                <span className="font-medium text-navy-800 truncate text-right">
                  {getPlayerName(entry.match, 2)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export const EmptyMatchState = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
    <TrophyOutlined className="text-4xl mb-3" />
    <p className="text-sm">Chọn một trận đấu ở danh sách để bắt đầu chấm điểm.</p>
  </div>
);

interface ScoreBoardProps {
  selected: MatchEntry;
  scores: Record<Slot, number>;
  currentSlot: Slot;
  secondsLeft: number;
  saving: boolean;
  onAwardPoint: (slot: Slot) => void;
  onAddExtraTime: () => void;
  onNextTurn: () => void;
  onSave: () => void;
}

export const ScoreBoard = ({
  selected,
  scores,
  currentSlot,
  secondsLeft,
  saving,
  onAwardPoint,
  onAddExtraTime,
  onNextTurn,
  onSave,
}: ScoreBoardProps) => {
  const gameOver = Math.max(scores[1], scores[2]) >= selected.raceTo;
  const clockExpired = secondsLeft <= 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-navy-800 whitespace-nowrap">
              {selected.match.code} · {selected.roundName}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Race to {selected.raceTo} · {getPlayerName(selected.match, 1)} vs{" "}
              {getPlayerName(selected.match, 2)}
            </p>
          </div>
          {gameOver && (
            <Tag color="success" className="!mr-0 whitespace-nowrap">
              Đã đạt điểm mục tiêu
            </Tag>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {([1, 2] as Slot[]).map((slot) => (
            <div
              key={slot}
              className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                currentSlot === slot && !gameOver ? "border-brand bg-primary-50" : "border-gray-200"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs text-gray-500 whitespace-nowrap">Cơ thủ {slot}</p>
                <p className="font-semibold text-navy-800 truncate">
                  {getPlayerName(selected.match, slot)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-navy-800 whitespace-nowrap">
                  {scores[slot]}
                </span>
                <Button
                  size="small"
                  variant="primary"
                  disabled={gameOver}
                  className="whitespace-nowrap"
                  onClick={() => onAwardPoint(slot)}
                >
                  Ghi điểm
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <ClockCircleOutlined
              className={`text-2xl ${clockExpired ? "text-red-500" : "text-brand"}`}
            />
            <div>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                Lượt của {getPlayerName(selected.match, currentSlot)}
              </p>
              <p
                className={`text-3xl font-bold font-mono whitespace-nowrap ${
                  clockExpired ? "text-red-500" : "text-navy-800"
                }`}
              >
                {formatClock(secondsLeft)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="small" variant="outline" className="whitespace-nowrap" onClick={onAddExtraTime}>
              +30s
            </Button>
            <Button
              size="small"
              variant="outline"
              leftIcon={<ClockCircleOutlined />}
              className="whitespace-nowrap"
              onClick={onNextTurn}
            >
              Sang lượt
            </Button>
            <Button
              size="small"
              variant="primary"
              loading={saving}
              leftIcon={<StopOutlined />}
              className="whitespace-nowrap"
              onClick={onSave}
            >
              Lưu kết quả
            </Button>
          </div>
        </div>
        {clockExpired && (
          <p className="mt-3 text-xs text-red-500 whitespace-nowrap">
            Đã quá giờ — lỗi &quot;Quá giờ&quot; đã được ghi nhận.
          </p>
        )}
      </div>
    </div>
  );
};

interface FaultPanelProps {
  faults: FaultEntry[];
  currentPlayerName: string;
  onRecordFault: (type: FaultType) => void;
}

export const FaultPanel = ({ faults, currentPlayerName, onRecordFault }: FaultPanelProps) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <h3 className="text-sm font-bold text-navy-800 whitespace-nowrap">Bảng lỗi ({faults.length})</h3>
    <p className="text-xs text-gray-500 mt-1">
      Ghi lỗi cho cơ thủ đang có lượt: {currentPlayerName}
    </p>
    <div className="flex flex-wrap gap-2 mt-3">
      {FAULT_TYPES.map((type) => (
        <Button
          key={type}
          size="small"
          variant="outline"
          className="whitespace-nowrap"
          onClick={() => onRecordFault(type)}
        >
          {type}
        </Button>
      ))}
    </div>
    {faults.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-6">Chưa có lỗi nào được ghi.</p>
    ) : (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2 whitespace-nowrap">Thời điểm</th>
              <th className="py-2 whitespace-nowrap">Cơ thủ</th>
              <th className="py-2 whitespace-nowrap">Lỗi</th>
            </tr>
          </thead>
          <tbody>
            {faults.map((fault) => (
              <tr key={fault.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-500 whitespace-nowrap">{fault.at}</td>
                <td className="py-2 text-navy-800 whitespace-nowrap">{fault.playerName}</td>
                <td className="py-2">
                  <Tag color="error" className="!mr-0 whitespace-nowrap">
                    {fault.type}
                  </Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
