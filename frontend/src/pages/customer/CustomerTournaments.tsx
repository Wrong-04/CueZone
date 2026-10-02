import { useState } from "react";
import {
  Trophy,
  Calendar,
  Coins,
  Award,
  Users,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  Button,
  Card,
  Tag,
  Space,
  Typography,
  Tabs,
  Modal,
} from "../../shared/ui";

const { Title, Text, Paragraph } = Typography;

interface TournamentItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  status: "open" | "upcoming" | "finished";
  format: string;
  fee: string;
  prizePool: string;
  date: string;
  participants: string;
  feeDetail: string;
  rulesDetail: string[];
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
}

const TOURNAMENTS_DATA: TournamentItem[] = [
  {
    id: "t1",
    title: "CueZone Bank Pool Open Championship Q2/2026",
    badge: "Đang Mở Đăng Ký",
    badgeColor: "green",
    status: "open",
    format: "Loại trực tiếp (Single Elimination) • Race to 5 (Chạm 5)",
    fee: "200.000 VNĐ / Cơ thủ",
    prizePool: "15.000.000 VNĐ + Cúp Vô Địch",
    firstPrize: "8.000.000 VNĐ + Cúp + Cờ lưu niệm",
    secondPrize: "4.000.000 VNĐ + Huy chương Bạc",
    thirdPrize: "1.500.000 VNĐ (Đồng hạng Ba x 2)",
    date: "15/10/2026 - 18/10/2026",
    participants: "24/32 Cơ thủ đã đăng ký",
    feeDetail:
      "Lệ phí 200.000 VNĐ đã bao gồm tiền giờ bàn suốt giải đấu, áo đấu CLB và nước uống miễn phí. Đóng lệ phí tại quầy hoặc qua VNPay QR trước 17h00 ngày 14/10.",
    rulesDetail: [
      "Áp dụng chuẩn Luật Bank Pool Quốc tế (BCA/WPA Rules).",
      "Quy tắc Gọi Bi & Gọi Lỗ: Phải chỉ định rõ bi mục tiêu và lỗ định đưa bi vào.",
      "Bi mục tiêu bắt buộc phải dội ít nhất 01 băng trước khi vào lỗ chỉ định.",
      "Mỗi cú đánh áp dụng Shot-Clock 40 giây (có 1 lần xin hội ý 30 giây mỗi ván).",
      "Trang phục thi đấu: Áo polo có cổ, quần tây tối màu, giày thể thao sạch sẽ.",
    ],
  },
  {
    id: "t2",
    title: "Bank Pool Weekend Challenge - Cơ Thủ Tranh Tài",
    badge: "Đang Mở Đăng Ký",
    badgeColor: "green",
    status: "open",
    format: "Đấu bảng vòng tròn & Knock-out • Race to 4",
    fee: "100.000 VNĐ / Cơ thủ",
    prizePool: "5.000.000 VNĐ + Điểm ELO",
    firstPrize: "2.500.000 VNĐ + Huy chương Vàng",
    secondPrize: "1.500.000 VNĐ + Huy chương Bạc",
    thirdPrize: "500.000 VNĐ (Đồng hạng Ba)",
    date: "Chủ Nhật hàng tuần (14:00 - 19:00)",
    participants: "12/16 Cơ thủ đã đăng ký",
    feeDetail: "Lệ phí 100.000 VNĐ. Hội viên sở hữu thẻ VIP Diamond được giảm 50% phí tham gia.",
    rulesDetail: [
      "Luật chạm 1 băng cơ bản, trọng tài CueZone bắt lỗi trực tiếp tại bàn.",
      "Cơ thủ phạm quy 3 lỗi liên tiếp trong 1 ván sẽ bị xử thua ván đó.",
      "Kết quả tính điểm trực tiếp vào Bảng xếp hạng ELO tháng của CLB.",
    ],
  },
  {
    id: "t3",
    title: "Giải Bank Pool Trẻ CueZone Junior Cup Q3",
    badge: "Sắp Diễn Ra",
    badgeColor: "gold",
    status: "upcoming",
    format: "Loại trực tiếp • Race to 3",
    fee: "50.000 VNĐ / Cơ thủ",
    prizePool: "3.000.000 VNĐ + Khóa học bida",
    firstPrize: "1.500.000 VNĐ + 01 Cơ Bida CueZone Custom",
    secondPrize: "1.000.000 VNĐ + Voucher 500k",
    thirdPrize: "500.000 VNĐ",
    date: "05/11/2026 - 06/11/2026",
    participants: "08/16 Cơ thủ đăng ký sớm",
    feeDetail: "Lệ phí 50.000 VNĐ dành cho cơ thủ dưới 22 tuổi hoặc học sinh sinh viên.",
    rulesDetail: [
      "Có huấn luyện viên hỗ trợ hướng dẫn trước trận đấu.",
      "Thời gian mỗi trận không quá 40 phút.",
    ],
  },
  {
    id: "t4",
    title: "CueZone Master Invitational Season 1",
    badge: "Đã Kết Thúc",
    badgeColor: "default",
    status: "finished",
    format: "Vòng chung kết 8 cơ thủ xuất sắc nhất • Race to 7",
    fee: "Miễn phí (Thư mời)",
    prizePool: "20.000.000 VNĐ",
    firstPrize: "Quán Quân: Cơ thủ Nguyễn Hoàng Nam (10.000.000 VNĐ)",
    secondPrize: "Á Quân: Cơ thủ Lê Quốc Bảo (6.000.000 VNĐ)",
    thirdPrize: "Hạng Ba: Cơ thủ Trần Đình Trọng (4.000.000 VNĐ)",
    date: "10/09/2026 - 12/09/2026",
    participants: "8/8 Cơ thủ hoàn thành",
    feeDetail: "Giải đấu vinh danh cơ thủ đạt ELO trên 1800 trong hệ thống CueZone.",
    rulesDetail: ["Áp dụng chuẩn quốc tế khắt khe có hệ thống camera VAR."],
  },
];

const BRACKET_ROUNDS = [
  {
    round: "Vòng Bán Kết",
    matches: [
      { player1: "Nguyễn Hoàng Nam", score1: "5", player2: "Đặng Tuấn Anh", score2: "3", winner: 1 },
      { player1: "Lê Quốc Bảo", score1: "5", player2: "Trần Đình Trọng", score2: "4", winner: 1 },
    ],
  },
  {
    round: "Trận Chung Kết Tranh Cúp",
    matches: [
      { player1: "Nguyễn Hoàng Nam", score1: "7", player2: "Lê Quốc Bảo", score2: "5", winner: 1 },
    ],
  },
];

const CustomerTournaments = () => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTournament, setSelectedTournament] = useState<TournamentItem | null>(null);

  const filteredTournaments =
    filterStatus === "all"
      ? TOURNAMENTS_DATA
      : TOURNAMENTS_DATA.filter((t) => t.status === filterStatus);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Trophy className="h-4 w-4 text-amber-600" />
            HỆ THỐNG GIẢI ĐẤU BANK POOL CUEZONE
          </div>
          <Title level={1} className="!text-3xl sm:!text-4xl !font-black !text-slate-900 !mb-0">
            Lịch Thi Đấu & Lệ Phí Tham Gia
          </Title>
          <Paragraph className="!text-sm !text-slate-600 !leading-relaxed !mb-0">
            Khám phá các giải đấu bida Bank Pool chuyên nghiệp và phong trào diễn ra định kỳ tại CLB. Minh bạch thể lệ, công khai cơ cấu giải thưởng và đăng ký online thuận tiện.
          </Paragraph>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <Tabs
          activeKey={filterStatus}
          onChange={setFilterStatus}
          className="cuezone-tourney-tabs [&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-tab]:!text-xs [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-700 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
          items={[
            { key: "all", label: `Tất Cả (${TOURNAMENTS_DATA.length})` },
            { key: "open", label: "Đang Mở Đăng Ký (2)" },
            { key: "upcoming", label: "Sắp Diễn Ra (1)" },
            { key: "finished", label: "Đã Kết Thúc (1)" },
          ]}
        />

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="h-4 w-4 text-emerald-600" />
          <span>Hội viên VIP Diamond được giảm 50% lệ phí</span>
        </div>
      </div>

      {/* Danh Sách Giải Đấu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTournaments.map((tourney) => (
          <Card
            key={tourney.id}
            className="!rounded-2xl !border-slate-200 !bg-white hover:!shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <Tag color={tourney.badgeColor} className="!text-xs !font-bold !px-2.5 !py-0.5 !rounded-md uppercase">
                  {tourney.badge}
                </Tag>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Users className="h-4 w-4 text-slate-400" />
                  {tourney.participants}
                </span>
              </div>

              <div>
                <Title level={3} className="!text-lg !font-bold !text-slate-900 !mb-1 leading-snug">
                  {tourney.title}
                </Title>
                <Text className="!text-xs !text-slate-500 block">
                  {tourney.format}
                </Text>
              </div>

              {/* Thông số giải */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Lệ phí thi đấu</span>
                  <strong className="text-amber-700 font-bold text-sm">{tourney.fee}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Tổng giải thưởng</span>
                  <strong className="text-emerald-700 font-bold text-sm">{tourney.prizePool}</strong>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span>Thời gian: {tourney.date}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTournament(tourney)}
                className="!text-xs !font-bold !border-slate-300 !text-slate-700 hover:!border-emerald-600 hover:!text-emerald-700 !rounded-xl"
              >
                Xem Thể Lệ & Lệ Phí Chi Tiết
              </Button>

              {tourney.status === "open" ? (
                <Button
                  variant="primary"
                  size="sm"
                  to="/register"
                  className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white !rounded-xl shadow-xs"
                >
                  Đăng Ký Tham Gia
                </Button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  {tourney.status === "upcoming" ? "Chưa mở đơn" : "Đã trao giải"}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Sơ đồ nhánh đấu mô phỏng (Tournament Bracket Visualizer) */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
              SƠ ĐỒ NHÁNH ĐẤU (BRACKET)
            </div>
            <Title level={2} className="!text-xl !font-bold !text-slate-900 !mb-0">
              Nhánh Thi Đấu Bank Pool Master Vòng Chung Kết
            </Title>
          </div>
          <Tag color="green" className="!text-xs !font-bold">LIVE MATCH STATS</Tag>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto py-4">
          {BRACKET_ROUNDS.map((round, rIndex) => (
            <div key={rIndex} className="space-y-4">
              <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-100 py-1.5 rounded-lg">
                {round.round}
              </div>

              <div className="space-y-4">
                {round.matches.map((m, mIndex) => (
                  <div key={mIndex} className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs">
                    <div className="p-3 bg-white flex items-center justify-between border-b border-slate-100">
                      <span className={`text-xs font-semibold ${m.winner === 1 ? "text-emerald-700 font-bold" : "text-slate-600"}`}>
                        {m.player1}
                      </span>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {m.score1}
                      </span>
                    </div>
                    <div className="p-3 bg-white flex items-center justify-between">
                      <span className={`text-xs font-semibold ${m.winner === 2 ? "text-emerald-700 font-bold" : "text-slate-600"}`}>
                        {m.player2}
                      </span>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {m.score2}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal chi tiết Thể Lệ & Lệ Phí */}
      <Modal
        open={Boolean(selectedTournament)}
        onCancel={() => setSelectedTournament(null)}
        footer={[
          <Button
            key="close"
            variant="outline"
            onClick={() => setSelectedTournament(null)}
            className="!text-xs !rounded-xl"
          >
            Đóng
          </Button>,
          <Button
            key="register"
            variant="primary"
            to="/register"
            onClick={() => setSelectedTournament(null)}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Đăng Ký Tài Khoản Tham Gia Giải
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="text-slate-900 text-base font-bold">
              {selectedTournament?.title}
            </span>
          </Space>
        }
      >
        {selectedTournament && (
          <div className="space-y-5 py-2 text-xs text-slate-700">
            {/* Lệ phí */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
              <Space align="center" size={6}>
                <Coins className="h-4 w-4 text-amber-600" />
                <Text strong className="!text-xs !text-amber-900">
                  Quy Định Lệ Phí Thi Đấu: {selectedTournament.fee}
                </Text>
              </Space>
              <p className="text-slate-600 leading-relaxed">
                {selectedTournament.feeDetail}
              </p>
            </div>

            {/* Cơ cấu giải thưởng */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <Space align="center" size={6}>
                <Award className="h-4 w-4 text-emerald-700" />
                <Text strong className="!text-xs !text-emerald-900">
                  Cơ Cấu Giải Thưởng: {selectedTournament.prizePool}
                </Text>
              </Space>
              <ul className="space-y-1 text-slate-700 pl-2">
                <li>🥇 <strong>Giải Nhất:</strong> {selectedTournament.firstPrize}</li>
                <li>🥈 <strong>Giải Nhì:</strong> {selectedTournament.secondPrize}</li>
                <li>🥉 <strong>Giải Ba:</strong> {selectedTournament.thirdPrize}</li>
              </ul>
            </div>

            {/* Điều lệ thi đấu */}
            <div>
              <Text strong className="!text-xs !text-slate-900 block mb-2">
                Điều Lệ & Quy Định Bắt Buộc:
              </Text>
              <ul className="space-y-2 pl-1">
                {selectedTournament.rulesDetail.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerTournaments;
