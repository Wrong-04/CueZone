import React from "react";
import { FilterOutlined, SearchOutlined, TrophyOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Input, Select, Spin } from "../../shared/ui";
import { TournamentCard } from "./TournamentCard";
import type { TournamentItem } from "../../services/tournament.service";

interface TournamentListTabProps {
  tournaments: TournamentItem[];
  loading: boolean;
  filter: string;
  searchQuery: string;
  onFilterChange: (val: string) => void;
  onSearchChange: (val: string) => void;
  onCreateClick: () => void;
  onEdit: (t: TournamentItem) => void;
  onDelete: (t: TournamentItem) => void;
  onOpenRegistration: (t: TournamentItem) => void;
  onViewParticipants: (t: TournamentItem) => void;
}

export const TournamentListTab: React.FC<TournamentListTabProps> = ({
  tournaments,
  loading,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onCreateClick,
  onEdit,
  onDelete,
  onOpenRegistration,
  onViewParticipants,
}) => {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-900">
            <FilterOutlined className="text-emerald-700" /> Trạng thái giải:
          </span>
          <Select
            value={filter}
            onChange={onFilterChange}
            className="!w-44 sm:!w-48 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả giải đấu" },
              { value: "draft", label: "Bản nháp (DRAFT)" },
              { value: "registration_open", label: "Đang mở đăng ký" },
              { value: "in_progress", label: "Đang diễn ra" },
              { value: "registration_closed", label: "Đã đóng đăng ký" },
              { value: "completed", label: "Đã hoàn thành" },
            ]}
          />
        </div>

        <div className="w-full sm:w-80">
          <Input
            placeholder="Tìm tên giải đấu, thể thức Bank Pool..."
            prefix={<SearchOutlined className="text-emerald-700" />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            className="!rounded-xl !h-10 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
          <Spin size="large" />
          <span className="text-xs text-slate-500 mt-3 font-medium">
            Đang đồng bộ danh sách giải đấu từ hệ thống CLB...
          </span>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-gradient-to-b from-[#064e3b] to-[#042f24] rounded-2xl border-2 border-[#1e293b] p-8 sm:p-12 text-center text-white shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-300/30 text-amber-300 flex items-center justify-center mx-auto mb-3 text-2xl">
            <TrophyOutlined />
          </div>
          <h4 className="text-white font-black text-base mb-1">
            Chưa có giải đấu nào trong danh mục này
          </h4>
          <p className="text-emerald-100/75 text-xs mb-5 max-w-md mx-auto leading-relaxed">
            Khởi tạo giải đấu Bank Pool mới để mở cổng ghi danh cho các cơ thủ hội viên tại CLB
            CueZone.
          </p>
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusOutlined />}
            onClick={onCreateClick}
            className="!bg-amber-500 hover:!bg-amber-400 !border-amber-400 !text-slate-950 !font-black !rounded-xl"
          >
            Khởi Tạo Giải Đấu Đầu Tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {tournaments.map((tourney) => (
            <TournamentCard
              key={tourney._id}
              tourney={tourney}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenRegistration={onOpenRegistration}
              onViewParticipants={onViewParticipants}
            />
          ))}
        </div>
      )}
    </div>
  );
};
