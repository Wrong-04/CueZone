import React, { useState } from "react";
import { tournamentService } from "../../services/tournament.service";
import { UserOutlined } from "@ant-design/icons";
import { Modal, Button, Tag } from "../../shared/ui";
import type { TournamentItem } from "../../services/tournament.service";
import { TournamentPaymentReconciliation } from "./TournamentPaymentReconciliation";

interface ParticipantsModalProps {
  open: boolean;
  tournament: TournamentItem | null;
  onClose: () => void;
}

export const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  open,
  tournament,
  onClose,
}) => {
  const [updated, setUpdated] = useState<TournamentItem | null>(null);
  const players = (updated?._id === tournament?._id ? updated : tournament)?.players || [];
  const refresh = async () => {
    if (tournament) setUpdated(await tournamentService.getTournamentById(tournament._id));
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      title={
        <div className="pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-900 text-base block">
            Danh Sách Cơ Thủ Ghi Danh
          </span>
          <span className="text-xs text-slate-500 font-normal">
            Giải: {tournament?.name} ({players.length}/{tournament?.maxPlayers || 16} cơ thủ)
          </span>
        </div>
      }
    >
      <div className="py-3 space-y-3">
        <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
          {players.length > 0 ? (
            players.map((p, idx) => (
              <div
                key={p.user || idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <UserOutlined />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{p.name}</span>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {p.phone || "---"} • Ngày ĐK:{" "}
                      {new Date(p.registeredAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
                <Tag color={p.feePaid ? "green" : "volcano"}>
                  {p.feePaid ? "Đã nộp lệ phí" : "Chưa nộp"}
                </Tag>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Chưa có cơ thủ nào đăng ký giải đấu này.
            </div>
          )}
        </div>

        {tournament && <TournamentPaymentReconciliation key={tournament._id} id={tournament._id} onFinalized={refresh} />}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} className="!rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
