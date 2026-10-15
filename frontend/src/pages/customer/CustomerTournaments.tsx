import { useState } from "react";
import {
  TrophyOutlined,
  CrownOutlined,
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WalletOutlined,
  FireOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Space,
  Typography,
  Tabs,
  Modal,
  Alert,
  message,
} from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";

const { Title, Text, Paragraph } = Typography;

interface TournamentItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  status: "open" | "upcoming" | "finished";
  format: string;
  fee: string;
  feeAmount: number;
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
    feeAmount: 200000,
    prizePool: "15.000.000 VNĐ + Cúp Vô Địch",
    firstPrize: "8.000.000 VNĐ + Cúp + Cờ lưu niệm",
    secondPrize: "4.000.000 VNĐ + Huy chương Bạc",
    thirdPrize: "1.500.000 VNĐ (Đồng hạng Ba x 2)",
    date: "15/10/2026 - 18/10/2026",
    participants: "24/32 Cơ thủ đã đăng ký",
    feeDetail:
      "Lệ phí 200.000 VNĐ đã bao gồm tiền giờ bàn suốt giải đấu, áo đấu CLB và nước uống miễn phí. Đóng lệ phí qua Ví CueZone Pay hoặc tại quầy trước 17h00 ngày 14/10.",
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
    feeAmount: 100000,
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
    feeAmount: 50000,
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
    feeAmount: 0,
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

const PERSONAL_MATCHES = [
  {
    id: "pm1",
    tournament: "Bank Pool Weekend Challenge #42",
    date: "28/09/2026",
    opponent: "Trần Đình Trọng (ELO 1790)",
    result: "Thắng 4 - 2",
    eloChange: "+24 ELO",
    isWin: true,
  },
  {
    id: "pm2",
    tournament: "CueZone Summer Cup 2026",
    date: "12/09/2026",
    opponent: "Nguyễn Hoàng Nam (ELO 1920)",
    result: "Thua 3 - 5",
    eloChange: "-12 ELO",
    isWin: false,
  },
  {
    id: "pm3",
    tournament: "Bank Pool Weekend Challenge #39",
    date: "24/08/2026",
    opponent: "Vũ Hải Đăng (ELO 1710)",
    result: "Thắng 4 - 1",
    eloChange: "+18 ELO",
    isWin: true,
  },
];

const CustomerTournaments = () => {
  const { user } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<string>("tournaments");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTournament, setSelectedTournament] = useState<TournamentItem | null>(null);

  // Registration modal states
  const [registeringTourney, setRegisteringTourney] = useState<TournamentItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "counter">("wallet");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredSuccess, setRegisteredSuccess] = useState<boolean>(false);

  const filteredTournaments =
    filterStatus === "all"
      ? TOURNAMENTS_DATA
      : TOURNAMENTS_DATA.filter((t) => t.status === filterStatus);

  const handleConfirmRegistration = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setRegisteredSuccess(true);
      message.success("Đăng ký giải đấu thành công! Mã ghi danh đã được cấp.");
    }, 1000);
  };

  const closeRegisterModal = () => {
    setRegisteringTourney(null);
    setRegisteredSuccess(false);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <TrophyOutlined className="text-amber-600" />
            HỆ THỐNG GIẢI ĐẤU BANK POOL CUEZONE
          </div>
          <Title level={1} className="!text-3xl sm:!text-4xl !font-black !text-slate-900 !mb-0">
            Giải Đấu & Thành Tích Cơ Thủ
          </Title>
          <Paragraph className="!text-sm !text-slate-600 !leading-relaxed !mb-0">
            Tham gia tranh tài tại các giải đấu Bank Pool định kỳ, theo dõi điểm số trực tiếp, sơ đồ nhánh đấu và bảng xếp hạng thành tích ELO cá nhân.
          </Paragraph>
        </div>
      </div>

      {/* Main Switcher: Tournaments vs Personal Achievements */}
      <div className="flex border-b border-slate-200">
        <Tabs
          activeKey={activeMainTab}
          onChange={setActiveMainTab}
          className="cuezone-main-tabs [&_.ant-tabs-tab]:!text-sm [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-700 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
          items={[
            {
              key: "tournaments",
              label: (
                <span className="flex items-center gap-2">
                  <TrophyOutlined />
                  Lịch Đấu & Nhánh Đấu ({TOURNAMENTS_DATA.length})
                </span>
              ),
            },
            {
              key: "achievements",
              label: (
                <span className="flex items-center gap-2">
                  <CrownOutlined />
                  Thành Tích & ELO Cá Nhân
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* TAB 1: Danh Sách Giải Đấu & Sơ đồ nhánh đấu */}
      {activeMainTab === "tournaments" && (
        <div className="space-y-8">
          {/* Sub Filter Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <Tabs
              activeKey={filterStatus}
              onChange={setFilterStatus}
              className="[&_.ant-tabs-nav]:!mb-0 [&_.ant-tabs-tab]:!text-xs [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-700 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
              items={[
                { key: "all", label: `Tất Cả (${TOURNAMENTS_DATA.length})` },
                { key: "open", label: "Đang Mở Đăng Ký (2)" },
                { key: "upcoming", label: "Sắp Diễn Ra (1)" },
                { key: "finished", label: "Đã Kết Thúc (1)" },
              ]}
            />

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <InfoCircleOutlined className="text-emerald-600" />
              <span>Hội viên VIP Diamond được giảm 50% lệ phí khi thanh toán qua ví</span>
            </div>
          </div>

          {/* Cards Grid */}
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
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <TeamOutlined className="text-slate-400" />
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
                      <CalendarOutlined className="text-slate-400 flex-shrink-0" />
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
                    Xem Thể Lệ & Lệ Phí
                  </Button>

                  {tourney.status === "open" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setRegisteringTourney(tourney)}
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
        </div>
      )}

      {/* TAB 2: Thành Tích & ELO Cá Nhân */}
      {activeMainTab === "achievements" && (
        <div className="space-y-6">
          {/* ELO Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="!rounded-2xl !border-slate-200 !bg-gradient-to-br !from-slate-900 !to-slate-800 text-white p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-300 font-medium">Hạng ELO Hiện Tại</span>
                <CrownOutlined className="text-amber-400 text-lg" />
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono">1,850</div>
              <span className="text-xs text-slate-300 block mt-1">Cấp Độ: Master Tier</span>
            </Card>

            <Card className="!rounded-2xl !border-slate-200 !bg-white p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">Xếp Hạng CLB</span>
                <TrophyOutlined className="text-emerald-600 text-lg" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">#04</div>
              <span className="text-xs text-emerald-600 font-semibold block mt-1">Top 5% Cơ thủ xuất sắc</span>
            </Card>

            <Card className="!rounded-2xl !border-slate-200 !bg-white p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">Tỷ Lệ Thắng (Win Rate)</span>
                <RiseOutlined className="text-blue-600 text-lg" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">68.2%</div>
              <span className="text-xs text-slate-500 block mt-1">32 Thắng / 47 Trận</span>
            </Card>

            <Card className="!rounded-2xl !border-slate-200 !bg-white p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">Danh Hiệu Đạt Được</span>
                <FireOutlined className="text-orange-600 text-lg" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">03 Cúp</div>
              <span className="text-xs text-slate-500 block mt-1">1 Vô Địch, 2 Á Quân</span>
            </Card>
          </div>

          {/* Lịch Sử Trận Đấu Giải */}
          <Card className="!rounded-2xl !border-slate-200 !bg-white" title={<span className="font-bold text-slate-900 text-sm">Lịch Sử Thi Đấu Giải Đấu Gần Đây</span>}>
            <div className="divide-y divide-slate-100">
              {PERSONAL_MATCHES.map((pm) => (
                <div key={pm.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{pm.tournament}</span>
                    <span className="text-[11px] text-slate-500 block">
                      Đối thủ: <strong>{pm.opponent}</strong> • Ngày: {pm.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag color={pm.isWin ? "green" : "red"} className="!text-xs !font-bold">
                      {pm.result}
                    </Tag>
                    <span className={`font-mono text-xs font-bold ${pm.isWin ? "text-emerald-600" : "text-red-500"}`}>
                      {pm.eloChange}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Modal Đăng Ký Tham Gia Giải & Trừ Ví Trả Trước */}
      <Modal
        open={Boolean(registeringTourney)}
        onCancel={closeRegisterModal}
        footer={null}
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500 text-base" />
            <span className="font-bold text-slate-900 text-sm">
              Đăng Ký Giải Đấu: {registeringTourney?.title}
            </span>
          </div>
        }
      >
        {registeringTourney && (
          <div className="space-y-4 py-2 text-xs">
            {registeredSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-xs">
                  <CheckCircleOutlined />
                </div>
                <Title level={3} className="!text-lg !font-bold !text-slate-900 !mb-0">
                  Ghi Danh Thành Công!
                </Title>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Bạn đã ghi danh giải <strong>{registeringTourney.title}</strong>. Lệ phí đã được trừ tự động vào Ví trả trước CueZone Pay.
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl inline-block text-left text-xs space-y-1">
                  <div>Mã vé thi đấu: <strong className="font-mono text-emerald-700">TK-CZ2026-889</strong></div>
                  <div>Cơ thủ: <strong>{user?.name || "Nguyễn Văn Cơ"}</strong></div>
                  <div>Trạng thái: <Tag color="green" className="!text-[10px]">ĐÃ ĐÓNG LỆ PHÍ</Tag></div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={closeRegisterModal}
                    className="!bg-emerald-600 !border-emerald-600 !rounded-xl"
                  >
                    Đóng Cửa Sổ
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giải đấu:</span>
                    <strong className="text-slate-800 text-right">{registeringTourney.title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thời gian khởi tranh:</span>
                    <strong className="text-slate-800">{registeringTourney.date}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lệ phí gốc:</span>
                    <strong className="text-slate-800">{registeringTourney.fee}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Ưu đãi VIP Diamond:</span>
                    <strong>-50%</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900">Tổng thanh toán:</span>
                    <span className="text-base font-black text-amber-700">
                      {(registeringTourney.feeAmount * 0.5).toLocaleString("vi-VN")} VNĐ
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block">Chọn phương thức đóng lệ phí:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPaymentMethod("wallet")}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        paymentMethod === "wallet"
                          ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <WalletOutlined className="text-emerald-600" />
                        <span className="font-bold text-slate-900">Ví CueZone Pay</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        Số dư: <strong className="text-emerald-700">750.000 VNĐ</strong>
                      </span>
                    </div>

                    <div
                      onClick={() => setPaymentMethod("counter")}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        paymentMethod === "counter"
                          ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <DollarOutlined className="text-slate-600" />
                        <span className="font-bold text-slate-900">Đóng tại quầy</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        Thanh toán trước ngày thi đấu
                      </span>
                    </div>
                  </div>
                </div>

                <Alert
                  type="info"
                  message="Quy chế hủy đăng ký"
                  description="Nếu hủy trước 24h giải đấu bắt đầu, 100% lệ phí sẽ được hoàn trả về Ví trả trước CueZone Pay."
                  className="!rounded-xl"
                />

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeRegisterModal}
                    className="!rounded-xl"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isSubmitting}
                    onClick={handleConfirmRegistration}
                    className="!bg-emerald-600 !border-emerald-600 !rounded-xl font-bold"
                  >
                    Xác Nhận Đăng Ký & Trừ Ví
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

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
            onClick={() => {
              const cur = selectedTournament;
              setSelectedTournament(null);
              if (cur && cur.status === "open") {
                setRegisteringTourney(cur);
              }
            }}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Đăng Ký Tham Gia Giải Này
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <TrophyOutlined className="text-amber-500 text-lg" />
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
                <DollarOutlined className="text-amber-600" />
                <Text strong className="!text-xs !text-amber-900">
                  Quy Định Lệ Phí Thi Đấu: {selectedTournament.fee}
                </Text>
              </Space>
              <p className="text-slate-600 leading-relaxed mb-0">
                {selectedTournament.feeDetail}
              </p>
            </div>

            {/* Cơ cấu giải thưởng */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <Space align="center" size={6}>
                <CrownOutlined className="text-emerald-700" />
                <Text strong className="!text-xs !text-emerald-900">
                  Cơ Cấu Giải Thưởng: {selectedTournament.prizePool}
                </Text>
              </Space>
              <ul className="space-y-1.5 text-slate-700 pl-1 mb-0">
                <li className="flex items-center gap-2">
                  <CrownOutlined className="text-amber-500" />
                  <span><strong>Giải Nhất:</strong> {selectedTournament.firstPrize}</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrophyOutlined className="text-slate-400" />
                  <span><strong>Giải Nhì:</strong> {selectedTournament.secondPrize}</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrophyOutlined className="text-amber-700" />
                  <span><strong>Giải Ba:</strong> {selectedTournament.thirdPrize}</span>
                </li>
              </ul>
            </div>

            {/* Điều lệ thi đấu */}
            <div>
              <Text strong className="!text-xs !text-slate-900 block mb-2">
                Điều Lệ & Quy Định Bắt Buộc:
              </Text>
              <ul className="space-y-2 pl-1 mb-0">
                {selectedTournament.rulesDetail.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-600">
                    <CheckCircleOutlined className="text-emerald-600 flex-shrink-0 mt-0.5" />
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
