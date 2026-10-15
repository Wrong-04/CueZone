import {
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Typography,
} from "../../shared/ui";

const { Title, Text, Paragraph } = Typography;

const FAQ_ITEMS = [
  {
    q: "Bi mục tiêu chạm 2 băng hoặc 3 băng rồi mới vào lỗ đã gọi thì có tính điểm không?",
    a: "CÓ. Trong luật Bank Pool quốc tế, bạn chỉ cần chỉ định số bi và lỗ dự định đưa vào. Bi mục tiêu chạm từ 1 băng trở lên (1 băng, 2 băng, 3 băng dội) và rơi đúng lỗ đã gọi đều được tính là cú đánh hợp lệ và ghi 01 điểm.",
  },
  {
    q: "Nếu bi mục tiêu va chạm vào bi khác (Kiss/Carom) trước khi dội băng thì có hợp lệ không?",
    a: "KHÔNG. Cú đánh Bank Pool chuẩn yêu cầu bi cái truyền lực trực tiếp vào bi mục tiêu, và bi mục tiêu dội vào băng sạch sẽ trước khi vào lỗ. Mọi va chạm không chủ ý làm đổi hướng trước khi chạm băng đều không được công nhận.",
  },
  {
    q: "Khi phạm quy (Foul), nếu tôi chưa ghi được điểm nào (0 điểm) thì phạt thế nào?",
    a: "Khi phạm lỗi mà bạn chưa có bi nào trong rổ điểm (0 bi), bạn sẽ bị ghi nhận 'nợ 1 bi' (-1). Ngay khi bạn đưa được bi hợp lệ tiếp theo vào lỗ, bi đó sẽ bị tịch thu đặt lại điểm Foot Spot để trả nợ phạt.",
  },
  {
    q: "Bi cái rơi vào lỗ (Scratch) thì đối thủ đánh tiếp ở vị trí nào?",
    a: "Đối thủ được hưởng quyền bi cái trong tay (Ball-in-hand) đặt tại bất kỳ vị trí nào phía sau lằn giao bóng (Head String / Kitchen) và phải đánh bi cái qua lằn giao bóng.",
  },
];

const CustomerRules = () => {
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Banner đầu trang */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <BookOpen className="h-4 w-4 text-emerald-600" />
          QUY TẮC THI ĐẤU CHÍNH THỨC WPA / BCA
        </div>
        <Title level={1} className="!text-3xl sm:!text-5xl !font-black !text-slate-900 !mb-0 leading-tight">
          Luật Thi Đấu Bida Bank Pool <br />
          <span className="text-emerald-600">Chuẩn Mực & Minh Bạch</span>
        </Title>
        <Paragraph className="!text-base !text-slate-600 !leading-relaxed !max-w-3xl !mb-0">
          Bank Pool (Bida dội băng) là thể loại bida đòi hỏi kỹ thuật hình học không gian, cảm giác băng và độ chuẩn xác lực tay cao nhất. Khám phá cẩm nang chi tiết dưới đây để sẵn sàng tham gia các trận thi đấu giải tại CueZone.
        </Paragraph>
      </div>

      {/* 4 Nguyên tắc cốt lõi */}
      <section className="space-y-6">
        <div>
          <Title level={2} className="!text-2xl !font-black !text-slate-900 !mb-1">
            4 Nguyên Tắc Cốt Lõi Của Bank Pool
          </Title>
          <Text className="!text-xs !text-slate-500">
            Nắm chắc 4 nguyên tắc này giúp bạn xử lý mọi tình huống bóng trên bàn đấu
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <Card className="!rounded-2xl !border-slate-200 !bg-white p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                01
              </span>
              <Tag color="green" className="!text-[10px] !font-bold uppercase">BẮT BUỘC</Tag>
            </div>
            <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
              Quy Tắc Chạm Băng Bắt Buộc (Cushion First)
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Bi mục tiêu sau khi nhận lực từ bi cái <strong>bắt buộc phải dội vào ít nhất 1 thành băng</strong> rồi mới được rơi vào lỗ. Nếu bi mục tiêu đi thẳng trực tiếp vào lỗ (Straight-in Shot) mà không chạm băng, cú đánh bị xem là không hợp lệ; bi đó được nhặt đặt lại bàn và mất lượt đánh.
            </Paragraph>
          </Card>

          {/* Card 2 */}
          <Card className="!rounded-2xl !border-slate-200 !bg-white p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="h-9 w-9 rounded-xl bg-teal-100 text-teal-800 font-black text-sm flex items-center justify-center">
                02
              </span>
              <Tag color="blue" className="!text-[10px] !font-bold uppercase">CALL SHOT</Tag>
            </div>
            <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
              Luật Gọi Bi & Gọi Lỗ (Call Ball & Pocket)
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Cơ thủ phải tuyên bố rõ ràng: <strong>&quot;Đánh bi số mấy vào lỗ nào&quot;</strong> trước khi thực hiện cú đánh. Không cần thông báo số lần dội băng (1 băng, 2 băng dội ngang, 3 băng dội góc). Nếu bi mục tiêu vào đúng lỗ đã gọi, cơ thủ được tính điểm và tiếp tục đánh.
            </Paragraph>
          </Card>

          {/* Card 3 */}
          <Card className="!rounded-2xl !border-slate-200 !bg-white p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="h-9 w-9 rounded-xl bg-rose-100 text-rose-800 font-black text-sm flex items-center justify-center">
                03
              </span>
              <Tag color="red" className="!text-[10px] !font-bold uppercase">PENALTY</Tag>
            </div>
            <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
              Lỗi Phạm Quy & Phạt Bi (Fouls)
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Phạm quy gồm: Bi cái rơi vào lỗ (scratch), bi cái không chạm bi mục tiêu, bi văng khỏi mặt bàn, hoặc cơ thủ chạm tay/quần áo vào bi trên bàn. Cơ thủ phạm lỗi bị phạt <strong>trừ 01 bi điểm số</strong> đặt lại bàn, đối thủ nhận bi cái trong tay (Ball-in-hand).
            </Paragraph>
          </Card>

          {/* Card 4 */}
          <Card className="!rounded-2xl !border-slate-200 !bg-white p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center">
                04
              </span>
              <Tag color="gold" className="!text-[10px] !font-bold uppercase">RACE TO 5</Tag>
            </div>
            <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
              Điều Kiện Chiến Thắng Ván Đấu
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Trong ván thi đấu chuẩn 9 bi tại CueZone, cơ thủ đầu tiên đưa thành công <strong>5 bi hợp lệ</strong> vào lỗ sẽ là người chiến thắng ván đấu (Chạm 5). Trong thể thức 15 bi, mốc chiến thắng là 8 bi.
            </Paragraph>
          </Card>
        </div>
      </section>

      {/* Bảng so sánh Hợp Lệ vs Phạm Quy */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-xs space-y-6">
        <Title level={2} className="!text-xl !font-bold !text-slate-900 !mb-0">
          Bảng Đối Chiếu Cú Đánh Hợp Lệ & Phạm Quy
        </Title>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Cột Hợp Lệ */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              CÁC TÌNH HUỐNG HỢP LỆ (TÍNH ĐIỂM)
            </div>
            <ul className="space-y-2.5 text-slate-700 pl-1 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircleOutlined className="text-emerald-600 mt-1 flex-shrink-0" />
                <span>Bi mục tiêu dội 1 băng vào đúng lỗ đã gọi.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleOutlined className="text-emerald-600 mt-1 flex-shrink-0" />
                <span>Bi mục tiêu dội 2 băng (Double Bank) hoặc 3 băng vào đúng lỗ đã gọi.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleOutlined className="text-emerald-600 mt-1 flex-shrink-0" />
                <span>Sau khi bi mục tiêu rơi vào lỗ hợp lệ, các bi phụ khác rơi vào lỗ cũng được nhặt lại bàn mà không bị phạt.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleOutlined className="text-emerald-600 mt-1 flex-shrink-0" />
                <span>Cơ thủ đánh trúng bi mục tiêu hợp lệ, không có bi vào lỗ nhưng có ít nhất 1 bi chạm băng (không bị foul).</span>
              </li>
            </ul>
          </div>

          {/* Cột Phạm Quy */}
          <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <XCircle className="h-5 w-5 text-rose-600" />
              CÁC TÌNH HUỐNG PHẠM QUY (PHẠT BI)
            </div>
            <ul className="space-y-2.5 text-slate-700 pl-1 leading-relaxed">
              <li className="flex items-start gap-2">
                <CloseCircleOutlined className="text-rose-600 mt-1 flex-shrink-0" />
                <span>Bi mục tiêu đi thẳng trực tiếp vào lỗ mà không chạm băng (không tính điểm, đặt lại bi).</span>
              </li>
              <li className="flex items-start gap-2">
                <CloseCircleOutlined className="text-rose-600 mt-1 flex-shrink-0" />
                <span>Bi cái rơi vào bất kỳ lỗ nào trên bàn (Scratch - phạt 1 bi).</span>
              </li>
              <li className="flex items-start gap-2">
                <CloseCircleOutlined className="text-rose-600 mt-1 flex-shrink-0" />
                <span>Bi mục tiêu rơi vào lỗ khác với lỗ đã gọi ban đầu (nhặt lại bi, mất lượt).</span>
              </li>
              <li className="flex items-start gap-2">
                <CloseCircleOutlined className="text-rose-600 mt-1 flex-shrink-0" />
                <span>Cơ thủ phạm quy 3 lần liên tiếp trong một ván đấu (xử thua ván đó ngay lập tức).</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Các câu hỏi thường gặp */}
      <section className="space-y-5">
        <Title level={2} className="!text-xl !font-bold !text-slate-900 !mb-0">
          Câu Hỏi Thường Gặp Của Cơ Thủ (Bank Pool FAQ)
        </Title>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5"
            >
              <div className="flex items-start gap-2.5 font-bold text-sm text-slate-900">
                <HelpCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </div>
              <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Giao Hữu */}
      <section className="rounded-3xl bg-slate-900 text-white p-8 text-center space-y-3 shadow-md">
        <Title level={3} className="!text-xl !font-bold !text-white !mb-0">
          Bạn Muốn Thử Nghiệm Kỹ Thuật Bank Pool Tại Bàn Thực Tế?
        </Title>
        <Paragraph className="!text-xs !text-slate-400 !max-w-lg !mx-auto !mb-0">
          CLB CueZone luôn có sẵn các bàn chuẩn thi đấu (Min, Rasson) và đội ngũ trọng tài hỗ trợ hướng dẫn luật chi tiết.
        </Paragraph>
        <div className="pt-2">
          <Button
            variant="primary"
            size="large"
            to="/customer/booking"
            className="!h-11 !px-6 !text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 text-white !rounded-xl"
          >
            Đặt Bàn Giao Hữu Ngay
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CustomerRules;
