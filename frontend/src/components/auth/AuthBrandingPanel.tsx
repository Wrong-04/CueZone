import React from "react";
import {
  Trophy,
  Sparkles,
  Flame,
  Award,
  Star,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button, Tag, Space, Typography } from "../../shared/ui";

const { Title, Text, Paragraph } = Typography;

const MEMBER_PERKS = [
  {
    icon: <Star className="h-4 w-4 text-emerald-400" />,
    title: "Đặt Bàn Trước Chuẩn Thi Đấu",
    desc: "Giữ bàn chuẩn quốc tế (Min, Rasson, Aileex) trước 24h không cần đặt cọc",
  },
  {
    icon: <Trophy className="h-4 w-4 text-amber-400" />,
    title: "Tích Điểm Tự Động & Đổi Quà",
    desc: "Hoàn 10% điểm tích lũy cho mỗi giờ chơi, đổi giờ miễn phí & voucher F&B",
  },
  {
    icon: <Award className="h-4 w-4 text-sky-400" />,
    title: "Giải Đấu Bank Pool & Xếp Hạng ELO",
    desc: "Tham gia các giải nội bộ cuối tuần có trọng tài chấm điểm & vinh danh cơ thủ",
  },
  {
    icon: <Sparkles className="h-4 w-4 text-teal-400" />,
    title: "Phục Vụ F&B Trực Tiếp Tại Bàn",
    desc: "Quét mã QR tại bàn gọi đồ uống, thức ăn nhẹ phục vụ tận nơi không ngắt quãng trận",
  },
];

interface AuthBrandingPanelProps {
  badgeText?: string;
  titlePrefix?: string;
  titleHighlight?: string;
  description?: string;
}

export const AuthBrandingPanel: React.FC<AuthBrandingPanelProps> = ({
  badgeText = "CỔNG TRẢI NGHIỆM CƠ THỦ & HỘI VIÊN ĐẲNG CẤP",
  titlePrefix = "Đẳng Cấp Cơ Thủ,",
  titleHighlight = "Đặc Quyền Vượt Trội",
  description = "Đăng nhập hoặc đăng ký tài khoản để đặt bàn giữ chỗ ưu tiên, theo dõi bảng xếp hạng ELO giải đấu Bank Pool và nhận voucher chào mừng hội viên mới.",
}) => {
  return (
    <div className="relative hidden lg:flex lg:w-[52%] min-h-screen flex-col justify-between p-8 xl:p-12 overflow-hidden border-r border-emerald-950/60 bg-gradient-to-br from-[#061118] via-[#070d14] to-[#04080e]">
      {/* Background image & gradient overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/cuezone_billiards_hero.jpg"
          alt="CueZone Billiards Club & Lounge"
          className="h-full w-full object-cover object-center filter brightness-[0.25] contrast-[1.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070d14] via-[#070d14]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#070d14]/50 to-[#070d14]" />
        <div className="absolute inset-0 bg-emerald-950/20 mix-blend-color" />
      </div>

      {/* Header Trái: Brand Logo */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="/cuezone-favicon.svg?v=2"
              alt="CueZone Logo"
              className="h-11 w-11 rounded-xl shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-500/60 p-0.5 bg-slate-950"
            />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#070d14]">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>
          <div>
            <Space align="center" size={8}>
              <Text className="!text-2xl !font-black !tracking-wider !text-white !mb-0">
                CUE<span className="text-emerald-400">ZONE</span>
              </Text>
              <Tag
                color="green"
                className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !border-emerald-500/40 !bg-emerald-500/20 !text-emerald-300"
              >
                BILLIARDS LOUNGE
              </Tag>
            </Space>
            <Text className="!text-xs !text-slate-400 block leading-tight font-medium">
              Hệ Thống Bida Giải Đấu & Hội Viên Chuyên Nghiệp
            </Text>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          to="/customer"
          rightIcon={<ArrowRight className="h-3.5 w-3.5 text-emerald-400" />}
          className="!border-slate-800 !bg-slate-900/70 !text-slate-300 hover:!border-emerald-500 hover:!text-emerald-300 backdrop-blur-md !text-xs !h-9 !px-3.5 shadow-sm"
        >
          Cổng Khách Vãng Lai
        </Button>
      </div>

      {/* Giữa: VIP Member Card Mockup + Đặc quyền hội viên */}
      <div className="relative z-10 max-w-xl space-y-6 my-auto py-6">
        <div>
          <Tag
            color="green"
            className="!inline-flex !items-center !gap-1.5 !rounded-full !border-emerald-500/40 !bg-emerald-500/15 !px-3 !py-1 !text-xs !font-semibold !text-emerald-300 shadow-sm shadow-emerald-500/10 mb-3"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>{badgeText}</span>
          </Tag>

          <Title
            level={1}
            className="!text-3xl xl:!text-4xl !font-extrabold !text-white !leading-tight !mb-2"
          >
            {titlePrefix} <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 bg-clip-text text-transparent">
              {titleHighlight}
            </span>
          </Title>
          <Paragraph className="!text-xs xl:!text-sm !text-slate-300 !leading-relaxed !mb-0">
            {description}
          </Paragraph>
        </div>

        {/* MOCKUP THẺ HỘI VIÊN CUEZONE ELITE MEMBER PASS */}
        <div className="relative rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-br from-[#0c2420] via-[#09151e] to-[#050b12] shadow-2xl shadow-emerald-950/80 backdrop-blur-xl overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
          {/* Ánh sáng holographic nền thẻ */}
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

          {/* Phần đầu thẻ */}
          <div className="flex items-center justify-between relative z-10 mb-6">
            <Space align="center" size={8}>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <Flame className="h-4 w-4 text-emerald-400 fill-emerald-400/30" />
              </div>
              <div>
                <Text strong className="!text-xs !tracking-widest !text-white uppercase block">
                  CueZone Elite Club
                </Text>
                <Text className="!text-[10px] !text-emerald-400/90 font-mono tracking-wider">
                  MEMBER PASS
                </Text>
              </div>
            </Space>

            <Tag
              color="gold"
              className="!rounded-md !px-2.5 !py-0.5 !text-[11px] !font-bold !border-amber-500/40 !bg-amber-500/15 !text-amber-300 flex items-center gap-1"
            >
              <Award className="h-3 w-3" />
              DIAMOND VIP
            </Tag>
          </div>

          {/* Chip & Số thẻ mô phỏng */}
          <div className="flex items-center justify-between relative z-10 mb-5">
            <div className="flex items-center gap-3">
              {/* EMV Chip mô phỏng */}
              <div className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1px] shadow-sm">
                <div className="h-full w-full rounded-[5px] bg-[#222] border border-amber-300/40 flex flex-col justify-around p-1">
                  <div className="h-[1px] bg-amber-400/60 w-full" />
                  <div className="h-[1px] bg-amber-400/60 w-full" />
                </div>
              </div>
              <Text className="!font-mono !text-xs !tracking-widest !text-slate-300">
                •••• •••• •••• 8829
              </Text>
            </div>

            <div className="text-right">
              <Text className="!text-[10px] !text-slate-400 uppercase tracking-wider block">
                Điểm tích lũy
              </Text>
              <Text strong className="!text-sm !text-emerald-300 font-mono">
                2,450 pts
              </Text>
            </div>
          </div>

          {/* Tên chủ thẻ & Thông số */}
          <div className="flex items-end justify-between relative z-10 border-t border-emerald-900/40 pt-3">
            <div>
              <Text className="!text-[10px] !text-slate-400 uppercase tracking-wider block">
                Cơ thủ hội viên
              </Text>
              <Text strong className="!text-sm !text-white tracking-wide">
                ĐẶNG TUẤN ANH
              </Text>
            </div>

            <Space size={12} className="text-right">
              <div>
                <Text className="!text-[10px] !text-slate-400 block">Tỉ lệ thắng</Text>
                <Text strong className="!text-xs !text-emerald-400">68%</Text>
              </div>
              <div>
                <Text className="!text-[10px] !text-slate-400 block">Hạng ELO</Text>
                <Text strong className="!text-xs !text-amber-400">Master 1850</Text>
              </div>
            </Space>
          </div>
        </div>

        {/* 4 Đặc quyền hội viên thực tế */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {MEMBER_PERKS.map((perk, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 backdrop-blur-md hover:border-emerald-800/50 transition-colors"
            >
              <Space align="center" size={8} className="mb-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
                  {perk.icon}
                </span>
                <Text strong className="!text-xs !text-white">
                  {perk.title}
                </Text>
              </Space>
              <Text className="!text-[11px] !text-slate-400 block leading-snug pl-9">
                {perk.desc}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Trái: Realtime Club Status & Bảo mật */}
      <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-3.5 text-xs text-slate-400">
        <Space align="center" size={8}>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20" />
          <Text className="!text-xs !text-slate-300">
            CLB hiện tại: <strong className="text-emerald-400 font-semibold">18/20 Bàn Thi Đấu Sẵn Sàng</strong>
          </Text>
        </Space>
        <Space align="center" size={6}>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <Text className="!text-xs !text-slate-400">Kết nối mã hóa bảo mật 256-bit</Text>
        </Space>
      </div>
    </div>
  );
};

export default AuthBrandingPanel;
