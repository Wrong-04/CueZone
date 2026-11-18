import React from "react";
import { TrophyOutlined, AlertOutlined } from "@ant-design/icons";
import { Card, Button, Tag, Typography } from "../../../../shared/ui";
import type { TournamentItem, BracketMatch } from "../../../../services/tournament.service";
import type { FnbStockItem } from "../../../../types";

const { Title, Text } = Typography;

interface LiveTournamentWidgetProps {
  activeTournament: TournamentItem | null;
  activeBracketMatch: BracketMatch | null;
  lowStockItems: FnbStockItem[];
  onNavigateTournament: () => void;
  onNavigateFnb: () => void;
}

export const LiveTournamentWidget: React.FC<LiveTournamentWidgetProps> = ({
  activeTournament,
  activeBracketMatch,
  lowStockItems,
  onNavigateTournament,
  onNavigateFnb,
}) => {
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
    >
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrophyOutlined className="text-base" />
          </div>
          <div>
            <Title
              level={4}
              className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
            >
              {activeTournament?.name || "Giải Đấu & Trọng Tài Bank Pool"}
            </Title>
            <Text className="!text-xs !text-slate-500 block whitespace-nowrap">
              {activeTournament?.assignedTables && activeTournament.assignedTables.length > 0
                ? `Bàn thi đấu: ${activeTournament.assignedTables.join(", ")}`
                : "Theo dõi lịch trình & bảng đấu trực tiếp"}
            </Text>
          </div>
        </div>

        <Tag
          color={
            activeTournament?.status === "in_progress"
              ? "green"
              : activeTournament?.status === "registration_open"
                ? "blue"
                : "orange"
          }
          className="!text-[10px] !px-2 !py-0.5 !font-bold whitespace-nowrap"
        >
          {activeTournament?.status === "in_progress"
            ? "ĐANG DIỄN RA"
            : activeTournament?.status === "registration_open"
              ? "ĐANG ĐĂNG KÝ"
              : "SẮP KHỞI TRANH"}
        </Tag>
      </div>

      <div className="p-4 space-y-3">
        {/* Tournament Match / Overview Strip */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
            <span className="truncate max-w-[200px]">
              {activeBracketMatch
                ? `${activeBracketMatch.roundName}${activeBracketMatch.table?.name ? ` • ${activeBracketMatch.table.name}` : ""}`
                : activeTournament?.name || "Giải đấu nội bộ CLB"}
            </span>
            <span className="text-emerald-700 font-mono whitespace-nowrap">
              RACE TO {activeTournament?.raceToScore || 4}
            </span>
          </div>

          {activeBracketMatch && activeBracketMatch.participants.length >= 2 ? (() => {
            const p1 = activeBracketMatch.participants[0];
            const p2 = activeBracketMatch.participants[1];
            const p1Name = p1?.user?.name || "Đang chờ cơ thủ";
            const p2Name = p2?.user?.name || "Đang chờ cơ thủ";
            const showScore =
              activeBracketMatch.status === "in_progress" ||
              activeBracketMatch.status === "completed";
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {p1Name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[110px]">
                      {p1Name}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      Hạt giống #{p1?.seed || 1}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 font-mono font-black text-lg text-slate-900 shadow-2xs shrink-0 whitespace-nowrap">
                  {showScore ? `${p1?.score ?? 0} - ${p2?.score ?? 0}` : "VS"}
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[110px]">
                      {p2Name}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      Hạt giống #{p2?.seed || 2}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {p2Name.charAt(0)}
                  </div>
                </div>
              </div>
            );
          })() : activeTournament?.players && activeTournament.players.length >= 2 ? (() => {
            const p1 = activeTournament.players[0];
            const p2 = activeTournament.players[activeTournament.players.length - 1];
            const p2Seed = p2.seed || activeTournament.players.length;
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {p1.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[110px]">
                      {p1.name}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      Hạt giống #{p1.seed || 1}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 font-mono font-black text-lg text-slate-900 shadow-2xs whitespace-nowrap">
                  VS
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[110px]">
                      {p2.name}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      Hạt giống #{p2Seed}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {p2.name.charAt(0)}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="py-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 whitespace-nowrap">Quy mô giải:</span>
                <strong className="text-slate-900 font-mono whitespace-nowrap">
                  {activeTournament?.players?.length || 0}/{activeTournament?.maxPlayers || 16} cơ thủ
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 whitespace-nowrap">Lệ phí tham gia:</span>
                <strong className="text-emerald-700 font-mono whitespace-nowrap">
                  {activeTournament?.registrationFee
                    ? `${Number(activeTournament.registrationFee).toLocaleString("vi-VN")}đ`
                    : "Miễn phí"}
                </strong>
              </div>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 whitespace-nowrap">
              Hình thức: <strong>{activeTournament?.format === "Single Elimination" || !activeTournament?.format ? "Loại trực tiếp" : activeTournament.format}</strong>
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={onNavigateTournament}
              className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0 whitespace-nowrap"
            >
              Xem Giải Đấu & Lịch Trình &rarr;
            </Button>
          </div>
        </div>

        {/* Low stock warning */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <AlertOutlined className="text-amber-600 text-sm" />
            <div>
              <span className="font-bold text-amber-950 block whitespace-nowrap">
                Kho Hàng F&B: {lowStockItems.length > 0 ? `${lowStockItems.length} Món Cần Bổ Sung` : "Kho Hàng Đầy Đủ"}
              </span>
              <span className="text-amber-800 text-[11px] block">
                {lowStockItems.length > 0
                  ? lowStockItems.slice(0, 3).map((item) => `${item.name} (còn ${item.stockQuantity})`).join(", ")
                  : "Tất cả đồ uống và phụ kiện đều đảm bảo định mức an toàn"}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateFnb}
            className="!text-xs !h-7 !rounded-lg !border-amber-300 !bg-white !text-amber-900 hover:!bg-amber-100 whitespace-nowrap"
          >
            {lowStockItems.length > 0 ? "Nhập Kho" : "Kiểm Kho"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
