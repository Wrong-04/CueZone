import React from "react";
import { CrownOutlined, AimOutlined, TrophyOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Tag, Table, type TableColumnsType } from "../../shared/ui";
import type { LeaderboardItem } from "../../services/tournament.service";

interface TournamentLeaderboardTabProps {
  leaderboard: LeaderboardItem[];
  loading: boolean;
  error?: string;
  onRefresh: () => void;
}

export const TournamentLeaderboardTab: React.FC<TournamentLeaderboardTabProps> = ({
  leaderboard,
  loading,
  error,
  onRefresh,
}) => {
  const leaderboardColumns: TableColumnsType<LeaderboardItem> = [
    {
      title: "Hạng",
      dataIndex: "rankIndex",
      key: "rankIndex",
      width: 80,
      align: "center",
      render: (rank: number) =>
        rank === 1 ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 text-sm flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
            <CrownOutlined />
          </div>
        ) : (
          <span className="font-mono font-bold text-slate-500 text-xs">
            #{String(rank).padStart(2, "0")}
          </span>
        ),
    },
    {
      title: "Cơ Thủ",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: LeaderboardItem) => (
        <div className="flex items-center gap-3">
          {record.avatar ? (
            <img
              src={record.avatar}
              alt={name}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-600/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-amber-300 flex items-center justify-center font-black">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span className="font-bold text-slate-900 text-sm block">{name}</span>
            <Tag color="green" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold">
              Hạng {record.rank}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Điểm ELO",
      dataIndex: "elo",
      key: "elo",
      width: 130,
      render: (elo: number) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#064e3b]/10 border border-emerald-600/20">
          <AimOutlined className="text-emerald-700 text-xs" />
          <span className="font-mono font-black text-emerald-800 text-sm">{elo}</span>
        </div>
      ),
    },
    {
      title: "Giải Đã Tham Gia",
      dataIndex: "tournamentsJoined",
      key: "tournamentsJoined",
      width: 150,
      align: "center",
      render: (n: number) => <span className="font-mono font-semibold text-slate-700">{n}</span>,
    },
    {
      title: "Vô Địch",
      dataIndex: "tournamentsWon",
      key: "tournamentsWon",
      width: 130,
      align: "center",
      render: (won: number) => (
        <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-mono font-bold text-xs">
          <TrophyOutlined className="text-amber-500" />
          <span>{won}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#064e3b] to-[#0f172a] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white mb-0.5">
            Bảng xếp hạng ELO cơ thủ
          </h3>
          <p className="text-xs text-emerald-200/80 mb-0">
            Gồm hội viên đã ghi danh ít nhất một giải, sắp xếp theo điểm ELO.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ReloadOutlined />}
          loading={loading}
          onClick={onRefresh}
          className="!rounded-xl !text-xs !text-emerald-200 hover:!bg-white/10"
        >
          Tải lại
        </Button>
      </div>

      {error ? (
        <div className="p-10 text-center text-sm text-rose-600">{error}</div>
      ) : (
        <Table<LeaderboardItem>
          columns={leaderboardColumns}
          dataSource={leaderboard}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 680 }}
          locale={{ emptyText: "Chưa có cơ thủ nào ghi danh giải đấu" }}
        />
      )}
    </div>
  );
};
