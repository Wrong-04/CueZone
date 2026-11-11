import React, { useState, useRef, useEffect } from "react";
import {
  TrophyOutlined,
  QrcodeOutlined,
  CalendarOutlined,
  DownloadOutlined,
  UserOutlined,
  EnvironmentOutlined,
  SafetyCertificateFilled,
} from "@ant-design/icons";
import { Modal, Button, message } from "../../shared/ui";
import QRCode from "qrcode";

export interface TournamentEPassData {
  tournamentId: string;
  tournamentName: string;
  format?: string;
  raceToScore?: number;
  startDate: string;
  endDate?: string;
  athleteName: string;
  athletePhone?: string;
  athleteCode?: string;
  paymentMethod?: string;
  registrationDate?: string;
  feeAmount?: number;
}

export interface TournamentAthletePassCardProps {
  data: TournamentEPassData;
  renderActions?: (handleDownload: () => void) => React.ReactNode;
}

export function TournamentAthletePassCard({
  data,
  renderActions,
}: TournamentAthletePassCardProps) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const passCardRef = useRef<HTMLDivElement>(null);

  const phoneDigits = (data.athletePhone || "").replace(/\D/g, "");
  const athleteSuffix = phoneDigits.slice(-4) || "VĐV";
  const tourneySuffix = (data.tournamentId || "").slice(-4).toUpperCase();
  const athleteCode = data.athleteCode || `CZ-${tourneySuffix}-${athleteSuffix}`;

  useEffect(() => {
    // ponytail: QR code hien tai chua du lieu JSON de doi chieu thu cong tai ban/quay, can nang cap endpoint check-in scanner tu dong khi backend ho tro.
    const checkinData = JSON.stringify({
      app: "CueZone",
      type: "TOURNAMENT_CHECKIN",
      tId: data.tournamentId,
      tName: data.tournamentName,
      athlete: data.athleteName,
      phone: data.athletePhone,
      code: athleteCode,
      validDate: data.startDate,
    });

    QRCode.toDataURL(checkinData, {
      width: 220,
      margin: 1,
      color: {
        dark: "#064e3b",
        light: "#ffffff",
      },
    })
      .then((url) => setQrSrc(url))
      .catch(() => setQrSrc(""));
  }, [
    data.tournamentId,
    data.tournamentName,
    data.athleteName,
    data.athletePhone,
    athleteCode,
    data.startDate,
  ]);

  const handleDownload = () => {
    if (!qrSrc) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 620;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 1000, 620);
    gradient.addColorStop(0, "#064e3b");
    gradient.addColorStop(0.5, "#065f46");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, 1000, 620, 28);
    ctx.fill();

    ctx.strokeStyle = "rgba(52, 211, 153, 0.3)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.beginPath();
    ctx.roundRect(40, 36, 210, 28, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("CUEZONE BILLIARDS CLUB", 52, 55);

    ctx.fillStyle = "#a7f3d0";
    ctx.font = "12px monospace";
    ctx.fillText("OFFICIAL PASS", 265, 55);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px sans-serif";
    const title = data.tournamentName;
    if (ctx.measureText(title).width > 700) {
      ctx.fillText(title.slice(0, 45) + "...", 40, 105);
    } else {
      ctx.fillText(title, 40, 105);
    }

    ctx.strokeStyle = "rgba(52, 211, 153, 0.2)";
    ctx.beginPath();
    ctx.moveTo(40, 130);
    ctx.lineTo(960, 130);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText("VẬN ĐỘNG VIÊN", 40, 170);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(data.athleteName, 40, 202);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText("MÃ THẺ VĐV", 380, 170);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 22px monospace";
    ctx.fillText(athleteCode, 380, 202);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText("KHỞI TRANH", 40, 255);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 16px sans-serif";
    const dateStr = new Date(data.startDate).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    ctx.fillText(dateStr, 40, 282);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText("THỂ THỨC", 380, 255);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(
      `${data.format || "Single Elimination"}${data.raceToScore ? ` • Chạm ${data.raceToScore}` : ""}`,
      380,
      282,
    );

    ctx.fillStyle = "rgba(6, 78, 59, 0.5)";
    ctx.beginPath();
    ctx.roundRect(40, 315, 680, 40, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(52, 211, 153, 0.25)";
    ctx.stroke();

    ctx.fillStyle = "#fcd34d";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("Địa điểm: CueZone Billiards Club • Tầng 1 Khu Thể Thao", 55, 340);

    ctx.strokeStyle = "rgba(52, 211, 153, 0.3)";
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(40, 385);
    ctx.lineTo(960, 385);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
    ctx.beginPath();
    ctx.roundRect(40, 420, 220, 34, 17);
    ctx.fill();
    ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
    ctx.stroke();

    ctx.fillStyle = "#6ee7b7";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("✓ ĐÃ THU LỆ PHÍ • HỢP LỆ", 58, 442);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText(
      "Xuất trình mã QR tại quầy lễ tân hoặc trọng tài vào ngày thi đấu để điểm danh.",
      40,
      485,
    );
    ctx.fillText("Thẻ có giá trị xác nhận tư cách cơ thủ chính thức của giải.", 40, 510);

    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(750, 400, 190, 190, 16);
      ctx.fill();

      ctx.drawImage(qrImg, 765, 410, 160, 160);

      ctx.fillStyle = "#475569";
      ctx.font = "bold 11px monospace";
      ctx.fillText("CHECK-IN QR", 808, 582);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `The-Thi-Dau-${data.tournamentName.replace(/\s+/g, "_")}-${athleteCode}.png`;
      link.click();
      message.success("Đã lưu thẻ thi đấu (PNG) chất lượng cao về máy!");
    };
    qrImg.src = qrSrc;
  };

  return (
    <div className="space-y-4">
      <div
        ref={passCardRef}
        className="relative bg-gradient-to-br from-emerald-950 via-[#064e3b] to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-emerald-500/30 overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 border-b border-emerald-500/20 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/15 px-2.5 py-0.5 rounded border border-emerald-400/30">
                CUEZONE BILLIARDS CLUB
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300/90">OFFICIAL PASS</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-snug mt-2 line-clamp-2">
              {data.tournamentName}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 text-xl shadow-inner">
            <TrophyOutlined />
          </div>
        </div>

        <div className="py-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                Vận động viên
              </span>
              <span className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5 truncate">
                <UserOutlined className="text-emerald-400 text-xs shrink-0" />
                <span className="truncate">{data.athleteName}</span>
              </span>
            </div>
            <div className="space-y-0.5 text-right sm:text-left">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                Mã thẻ VĐV
              </span>
              <span className="font-mono font-black text-amber-300 text-sm sm:text-base">
                {athleteCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2.5 border-t border-emerald-500/15">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                Thời gian khai mạc
              </span>
              <span className="font-medium text-slate-200 flex items-center gap-1.5 text-xs">
                <CalendarOutlined className="text-emerald-400 shrink-0" />
                {new Date(data.startDate).toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="space-y-0.5 text-right sm:text-left">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                Thể thức thi đấu
              </span>
              <span className="font-medium text-slate-200 text-xs">
                {data.format || "Single Elimination"}
                {data.raceToScore ? ` • Chạm ${data.raceToScore}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-emerald-950/60 px-3.5 py-2.5 rounded-xl border border-emerald-500/20">
            <EnvironmentOutlined className="text-amber-400 text-xs shrink-0" />
            <span>Địa điểm: CueZone Billiards Club • Bàn thi đấu chỉ định CLB</span>
          </div>
        </div>

        <div className="relative flex items-center justify-between my-1">
          <div className="w-5 h-5 -ml-8 rounded-full bg-slate-900 border-r border-emerald-500/30" />
          <div className="w-full border-t border-dashed border-emerald-500/30 mx-2" />
          <div className="w-5 h-5 -mr-8 rounded-full bg-slate-900 border-l border-emerald-500/30" />
        </div>

        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 text-xs font-bold">
              <SafetyCertificateFilled className="text-emerald-400" />
              ĐÃ THU LỆ PHÍ • HỢP LỆ
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-0 max-w-xs">
              Xuất trình mã QR tại quầy lễ tân hoặc trọng tài vào ngày thi đấu để điểm danh và nhận bàn.
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-2xl shadow-lg shrink-0 flex flex-col items-center mx-auto sm:mx-0">
            {qrSrc ? (
              <img src={qrSrc} alt="Check-in QR" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-slate-400">
                <QrcodeOutlined className="text-2xl" />
              </div>
            )}
            <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 tracking-wider">
              CHECK-IN QR
            </span>
          </div>
        </div>
      </div>

      {renderActions ? (
        renderActions(handleDownload)
      ) : (
        <div className="flex items-center justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            leftIcon={<DownloadOutlined />}
            className="!rounded-xl border-emerald-500 text-emerald-800 hover:!bg-emerald-50 font-bold"
          >
            Tải Thẻ Thi Đấu (PNG)
          </Button>
        </div>
      )}
    </div>
  );
}

interface TournamentEPassModalProps {
  open: boolean;
  onClose: () => void;
  data: TournamentEPassData | null;
}

export function TournamentEPassModal({ open, onClose, data }: TournamentEPassModalProps) {
  if (!data) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      title={
        <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100">
          <TrophyOutlined className="text-amber-500 text-lg" />
          <span className="font-bold text-base">Thẻ Vận Động Viên Điện Tử (E-Pass)</span>
        </div>
      }
    >
      <div className="py-2 space-y-4">
        <TournamentAthletePassCard
          data={data}
          renderActions={(handleDownload) => (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                leftIcon={<DownloadOutlined />}
                className="!rounded-xl border-emerald-500 text-emerald-800 hover:!bg-emerald-50 font-bold"
              >
                Tải Thẻ Thi Đấu (PNG)
              </Button>
              <Button variant="primary" size="sm" onClick={onClose} className="!rounded-xl">
                Đóng thẻ
              </Button>
            </div>
          )}
        />
      </div>
    </Modal>
  );
}
