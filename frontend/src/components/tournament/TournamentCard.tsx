import React from "react";
import {
  TrophyOutlined,
  FireOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Tag } from "../../shared/ui";
import type { TournamentItem, TournamentStatus } from "../../services/tournament.service";

interface TournamentCardProps {
  tourney: TournamentItem;
  onEdit: (t: TournamentItem) => void;
  onDelete: (t: TournamentItem) => void;
  onOpenRegistration: (t: TournamentItem) => void;
  onViewParticipants: (t: TournamentItem) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tourney,
  onEdit,
  onDelete,
  onOpenRegistration,
  onViewParticipants,
}) => {
  const registeredCount = tourney.players?.length || 0;
  const maxPlayers = tourney.maxPlayers || 16;
  const percent = Math.round((registeredCount / maxPlayers) * 100);

  const getStatusBadge = (status: TournamentStatus) => {
    switch (status) {
      case "draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-600 text-[11px] font-mono font-bold">
            BẢN NHÁP (DRAFT)
          </span>
        );
      case "registration_open":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ĐANG MỞ GHI DANH
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/25 text-rose-200 border border-rose-400/40 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            ĐANG THI ĐẤU LIVE
          </span>
        );
      case "registration_closed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/40 text-[11px] font-bold">
            ĐÃ KHÓA SỔ ĐĂNG KÝ
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
            <TrophyOutlined /> ĐÃ KẾT THÚC
          </span>
        );
      default:
        return (
          <Tag color="default" className="!rounded-full !text-xs">
            {status}
          </Tag>
        );
    }
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return "Đang cập nhật";
    const s = new Date(start).toLocaleDateString("vi-VN");
    const e = end ? new Date(end).toLocaleDateString("vi-VN") : "";
    return e ? `${s} - ${e}` : s;
  };

  return (
    <div className="rounded-2xl border-2 border-slate-800/90 bg-white shadow-sm hover:shadow-lg hover:border-emerald-700 transition-all overflow-hidden flex flex-col justify-between">
      <div>
        <div className="p-4 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white flex items-start justify-between gap-3 border-b border-slate-700/60">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/25">
                Bank Pool
              </span>
              <span className="text-[10px] font-mono text-emerald-300">
                Chạm {tourney.raceToScore || 5}
              </span>
            </div>
            <h3 className="font-black text-white text-base truncate mb-0">{tourney.name}</h3>
          </div>
          <div className="shrink-0">{getStatusBadge(tourney.status)}</div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Thời gian diễn ra</span>
              <strong className="text-slate-800 font-mono">
                {formatDateRange(tourney.startDate, tourney.endDate)}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Hạn chót đăng ký</span>
              <strong className="text-amber-800 font-mono">
                {tourney.registrationDeadline
                  ? new Date(tourney.registrationDeadline).toLocaleDateString("vi-VN")
                  : "---"}
              </strong>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Lệ phí giải đấu</span>
                <strong className="text-emerald-700 font-mono text-sm">
                  {tourney.registrationFee > 0
                    ? `${tourney.registrationFee.toLocaleString("vi-VN")}đ`
                    : "Miễn phí"}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Giải thưởng</span>
                <span className="text-amber-600 font-bold text-xs truncate max-w-[180px] block">
                  {tourney.prizePool || "Cúp CLB + Thưởng"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-slate-600">Tiến độ cơ thủ ghi danh:</span>
              <span className="font-mono text-emerald-700">
                {registeredCount}/{maxPlayers} ({percent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percent >= 100
                    ? "bg-emerald-600"
                    : percent >= 75
                      ? "bg-amber-500"
                      : "bg-[#064e3b]"
                }`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
        {tourney.status === "draft" && (
          <div className="space-y-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenRegistration(tourney)}
              leftIcon={<FireOutlined />}
              className="!w-full !rounded-xl !bg-emerald-700 hover:!bg-emerald-600 !border-emerald-600 !text-white font-black !text-xs !h-9 shadow-xs"
            >
              Mở Đăng Ký Chính Thức
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(tourney)}
                leftIcon={<EditOutlined />}
                className="!rounded-xl !text-xs !h-8 font-semibold"
              >
                Sửa Thông Tin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(tourney)}
                leftIcon={<DeleteOutlined />}
                className="!rounded-xl !text-xs !h-8 font-semibold !text-rose-600 !border-rose-200 hover:!bg-rose-50 hover:!border-rose-300"
              >
                Xóa Bản Nháp
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewParticipants(tourney)}
            leftIcon={<TeamOutlined />}
            className="!rounded-xl !text-xs !h-9 font-bold !text-slate-800 !border-slate-300 hover:!border-emerald-600 hover:!text-emerald-700"
          >
            Duyệt Cơ Thủ ({registeredCount})
          </Button>
        </div>
      </div>
    </div>
  );
};
