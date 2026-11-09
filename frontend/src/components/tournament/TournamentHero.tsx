import React from "react";
import {
  TrophyOutlined,
  PlusOutlined,
  CrownOutlined,
  ReloadOutlined,
  CalendarOutlined,
  FireOutlined,
  TeamOutlined,
  AimOutlined,
} from "@ant-design/icons";
import { Button, Typography } from "../../shared/ui";
import type { TournamentItem } from "../../services/tournament.service";

const { Title, Text } = Typography;

export const BilliardBallBadge: React.FC<{
  number: number;
  colorClass: string;
  striped?: boolean;
  size?: "sm" | "md";
}> = ({ number, colorClass, striped = false, size = "md" }) => {
  const dims = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <span
      className={`${dims} relative rounded-full inline-flex items-center justify-center font-mono font-black shadow-inner border border-black/20 select-none overflow-hidden shrink-0 ${
        striped ? "bg-amber-50" : colorClass
      }`}
    >
      {striped && <span className={`absolute inset-x-0 top-1.5 bottom-1.5 ${colorClass}`} />}
      <span className="relative z-10 w-4 h-4 rounded-full bg-white text-slate-950 flex items-center justify-center text-[10px] font-black leading-none shadow-2xs">
        {number}
      </span>
    </span>
  );
};

export interface TournamentMetrics {
  totalTourneys: number;
  activeCount: number;
  totalRegistered: number;
  inProgressCount: number;
  assignedTableCount: number;
}

interface TournamentHeroProps {
  metrics: TournamentMetrics;
  nextTournament?: TournamentItem;
  onCreateClick: () => void;
  onLeaderboardClick: () => void;
  onRefreshClick: () => void;
}

export const TournamentHero: React.FC<TournamentHeroProps> = ({
  metrics,
  nextTournament,
  onCreateClick,
  onLeaderboardClick,
  onRefreshClick,
}) => {
  return (
    <div className="rounded-b-[20px] bg-[#161f2c] p-2 sm:p-3 shadow-xl border-b-2 border-x-0 border-t-0 border-[#29384d] relative overflow-hidden">
      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute top-1.5 left-1.5 z-20 pointer-events-none shadow-inner" />
      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute top-1.5 right-1.5 z-20 pointer-events-none shadow-inner" />
      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute bottom-1.5 left-1.5 z-20 pointer-events-none shadow-inner" />
      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#070b10] border-2 border-amber-500/40 absolute bottom-1.5 right-1.5 z-20 pointer-events-none shadow-inner" />
      <span className="w-5 sm:w-6 h-3 sm:h-4 rounded-b-full bg-[#070b10] border-b-2 border-x-2 border-amber-500/35 absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none" />
      <span className="w-5 sm:w-6 h-3 sm:h-4 rounded-t-full bg-[#070b10] border-t-2 border-x-2 border-amber-500/35 absolute bottom-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none" />

      <div className="hidden sm:flex items-center justify-around px-20 pb-1 opacity-60 pointer-events-none">
        <span className="w-1.5 h-1.5 rotate-45 bg-amber-300/70" />
        <span className="w-1.5 h-1.5 rotate-45 bg-amber-300/70" />
        <span className="w-1.5 h-1.5 rotate-45 bg-amber-300/70" />
        <span className="w-1.5 h-1.5 rotate-45 bg-amber-300/70" />
      </div>

      <div className="relative rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#053b2c] to-[#04281e] border border-emerald-400/25 p-4 sm:p-6 overflow-hidden shadow-[inset_0_2px_24px_rgba(0,0,0,0.45)]">
        <div className="absolute top-0 bottom-0 left-[28%] w-px bg-white/10 pointer-events-none hidden lg:block" />
        <div className="absolute top-1/2 left-[28%] -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-white/20 bg-white/10 pointer-events-none hidden lg:block" />
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center pb-5 border-b border-emerald-300/15">
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/35 text-amber-200 text-[11px] font-black uppercase tracking-wider">
                <TrophyOutlined className="text-amber-300" />
                CUEZONE • GIẢI ĐẤU BANK POOL
              </span>
            </div>

            <div className="flex items-center gap-3">
              <BilliardBallBadge number={9} colorClass="bg-amber-400" striped />
              <Title
                level={1}
                className="!text-xl sm:!text-2xl md:!text-3xl !font-black !text-white !mb-0 tracking-tight"
              >
                Quản Lý Giải Đấu Bida
              </Title>
            </div>

            <Text className="!text-xs sm:!text-sm !text-emerald-100/80 max-w-[62ch] block leading-relaxed">
              Tạo giải, mở ghi danh, duyệt cơ thủ và theo dõi bảng xếp hạng ELO của câu lạc bộ.
            </Text>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                variant="primary"
                size="md"
                leftIcon={<PlusOutlined />}
                onClick={onCreateClick}
                className="!bg-amber-500 hover:!bg-amber-400 !border-amber-400 !text-slate-950 !rounded-xl !font-black shadow-sm active:scale-[0.98]"
              >
                Tạo Giải Đấu Mới
              </Button>
              <Button
                variant="outline"
                size="md"
                leftIcon={<CrownOutlined />}
                onClick={onLeaderboardClick}
                className="!rounded-xl !text-xs font-bold !bg-emerald-950/70 !text-emerald-100 !border-emerald-400/35 hover:!bg-emerald-900/80 hover:!border-amber-300/60 active:scale-[0.98]"
              >
                Xem Bảng Xếp Hạng
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ReloadOutlined />}
                onClick={onRefreshClick}
                className="!rounded-xl !text-xs !text-emerald-200 hover:!bg-white/10"
              >
                Đồng bộ
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-[#091512]/90 border border-emerald-400/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] space-y-2.5">
              <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2">
                <span className="text-[11px] font-mono font-black uppercase tracking-wider text-amber-300">
                  Giải gần nhất
                </span>
                {nextTournament && (
                  <span className="text-[11px] font-mono text-emerald-300/90">
                    Race to {nextTournament.raceToScore}
                  </span>
                )}
              </div>

              {nextTournament ? (
                <>
                  <div>
                    <span className="text-sm font-bold text-white block truncate">
                      {nextTournament.name}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-300/80">
                      {new Date(nextTournament.startDate).toLocaleDateString("vi-VN")} -{" "}
                      {new Date(nextTournament.endDate).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-500/15 text-[11px] text-emerald-200/75">
                    <span>
                      Đã ghi danh {nextTournament.players?.length || 0}/{nextTournament.maxPlayers}{" "}
                      cơ thủ
                    </span>
                    <button
                      type="button"
                      onClick={onLeaderboardClick}
                      className="text-amber-300 hover:text-amber-200 font-bold underline underline-offset-2 cursor-pointer"
                    >
                      Xem xếp hạng
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-emerald-100/70 mb-0 py-1">
                  Chưa có giải đấu nào đang mở hoặc sắp diễn ra.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 relative z-10">
          <div className="p-3.5 rounded-xl bg-[#071f18]/85 border border-emerald-400/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] text-emerald-200/75 font-bold uppercase tracking-wider">
                Tổng Giải Mùa Này
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-900/80 flex items-center justify-center text-amber-300 text-xs border border-emerald-400/25">
                <CalendarOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                {String(metrics.totalTourneys).padStart(2, "0")}
              </span>
              <span className="text-[11px] font-medium text-emerald-300/80">giải CLB</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#071f18]/85 border border-emerald-400/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] text-emerald-200/75 font-bold uppercase tracking-wider">
                Đang Mở / Tranh Tài
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-900/80 flex items-center justify-center text-emerald-300 text-xs border border-emerald-400/25">
                <FireOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-tight">
                {String(metrics.activeCount).padStart(2, "0")}
              </span>
              <span className="text-[11px] font-medium text-emerald-300/80">giải hoạt động</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#071f18]/85 border border-emerald-400/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] text-emerald-200/75 font-bold uppercase tracking-wider">
                Cơ Thủ Đã Ghi Danh
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-900/80 flex items-center justify-center text-emerald-200 text-xs border border-emerald-400/25">
                <TeamOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                {String(metrics.totalRegistered).padStart(2, "0")}
              </span>
              <span className="text-[11px] font-medium text-emerald-300/80">tay cơ tham dự</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#071f18]/85 border border-emerald-400/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] text-emerald-200/75 font-bold uppercase tracking-wider">
                Bàn Được Chỉ Định
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-900/80 flex items-center justify-center text-emerald-200 text-xs border border-emerald-400/25">
                <AimOutlined />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1.5">
              <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                {String(metrics.assignedTableCount).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                {metrics.inProgressCount} giải đấu
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
