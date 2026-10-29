import { useState, useEffect } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  Compass,
  AlertCircle,
  Layers,
} from "lucide-react";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Button, Card, Tag, Typography } from "../../shared/ui";
import { BankPoolTable2D } from "../../components/rules/BankPoolTable2D";
import {
  rulesService,
  FALLBACK_RULES_DATA,
  type BankPoolRulesData,
  type BankPoolRuleScenario,
} from "../../services/rules.service";

const { Title, Text, Paragraph } = Typography;

const CustomerRules = () => {
  const [rulesData, setRulesData] = useState<BankPoolRulesData>(FALLBACK_RULES_DATA);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("cross-bank");

  useEffect(() => {
    let isMounted = true;
    rulesService.getBankPoolRules().then((res) => {
      if (isMounted && res) {
        setRulesData(res);
        if (res.scenarios2D?.length > 0) {
          setSelectedScenarioId(res.scenarios2D[0].id);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const currentScenario: BankPoolRuleScenario =
    rulesData.scenarios2D?.find((s) => s.id === selectedScenarioId) ||
    rulesData.scenarios2D?.[0] ||
    FALLBACK_RULES_DATA.scenarios2D[0];

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-12">
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <BookOpen className="h-4 w-4 text-emerald-600" />
          {rulesData.standardOrg}
        </div>
        <Title
          level={1}
          className="!text-3xl sm:!text-5xl !font-black !text-slate-900 !mb-0 leading-tight"
        >
          {rulesData.title} <br />
          <span className="text-emerald-600">Chuẩn Mực & Minh Bạch</span>
        </Title>
        <Paragraph className="!text-base !text-slate-600 !leading-relaxed !max-w-3xl !mb-0">
          {rulesData.summary}
        </Paragraph>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <Compass className="h-4 w-4" />
              SƠ ĐỒ TRỰC QUAN HÓA 2D
            </div>
            <Title level={2} className="!text-2xl !font-black !text-slate-900 !mb-0 mt-1">
              Mô Phỏng Cú Đánh Dội Băng Hợp Lệ & Phạm Quy
            </Title>
          </div>
          <Text className="text-xs text-slate-500">
            Chọn thế bi bên dưới để xem quỹ đạo di chuyển của bi mục tiêu
          </Text>
        </div>

        <div className="flex flex-wrap gap-2">
          {rulesData.scenarios2D?.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-500"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    sc.isLegal ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                {sc.name}
              </button>
            );
          })}
        </div>

        <BankPoolTable2D scenario={currentScenario} />
      </section>

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
          {rulesData.coreRules?.map((rule) => (
            <Card
              key={rule.number}
              className="!rounded-2xl !border-slate-200 !bg-white p-6 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                  {rule.number}
                </span>
                <Tag color={rule.color} className="!text-[10px] !font-bold uppercase">
                  {rule.tag}
                </Tag>
              </div>
              <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
                {rule.title}
              </Title>
              <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
                {rule.content}
              </Paragraph>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <Title level={2} className="!text-2xl !font-black !text-slate-900 !mb-1">
            Quy Tắc Đặt Lại Bi Cái & Cách Tính Điểm Ván Đấu
          </Title>
          <Text className="!text-xs !text-slate-500">
            Chi tiết xử lý tình huống bi cái trong tay (Ball-in-hand) và mốc điểm chiến thắng
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="!rounded-2xl !border-slate-200 !bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Layers className="h-5 w-5 text-emerald-600" />
              BI CÁI TRONG TAY (BALL-IN-HAND) & ĐẶT LẠI BI
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="font-bold text-slate-900">
                  1. Vị trí đặt bi cái sau khi đối thủ phạm lỗi:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 leading-relaxed">
                  {rulesData.cueBallAndScoring?.ballInHandRules?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="font-bold text-slate-900">
                  2. Quy tắc nhặt lại bi & Đặt tại Foot Spot:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 leading-relaxed">
                  {rulesData.cueBallAndScoring?.respottingRules?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="!rounded-2xl !border-slate-200 !bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Trophy className="h-5 w-5 text-emerald-600" />
              MỐC ĐIỂM CHIẾN THẮNG THEO THỂ THỨC (RACE TARGETS)
            </div>

            <div className="space-y-3">
              {rulesData.cueBallAndScoring?.raceTargets?.map((rt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{rt.gameType}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                        {rt.targetScore}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{rt.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Nợ bi phạt (-1):</strong> Nếu bạn chưa ghi được điểm nào mà phạm lỗi, bi hợp
                lệ tiếp theo bạn ăn được sẽ dùng để thanh toán điểm phạt và đặt lại bàn, chưa được
                cộng vào điểm của bạn.
              </span>
            </div>
          </Card>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-xs space-y-6">
        <Title level={2} className="!text-xl !font-bold !text-slate-900 !mb-0">
          Bảng Đối Chiếu Cú Đánh Hợp Lệ & Phạm Quy
        </Title>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              CÁC TÌNH HUỐNG HỢP LỆ (TÍNH ĐIỂM)
            </div>
            <ul className="space-y-2.5 text-slate-700 pl-1 leading-relaxed">
              {rulesData.comparison?.legal?.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircleOutlined className="text-emerald-600 mt-1 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <XCircle className="h-5 w-5 text-rose-600" />
              CÁC TÌNH HUỐNG PHẠM QUY (PHẠT BI)
            </div>
            <ul className="space-y-2.5 text-slate-700 pl-1 leading-relaxed">
              {rulesData.comparison?.fouls?.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CloseCircleOutlined className="text-rose-600 mt-1 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <Title level={2} className="!text-xl !font-bold !text-slate-900 !mb-0">
          Câu Hỏi Thường Gặp Của Cơ Thủ (Bank Pool FAQ)
        </Title>

        <div className="space-y-3">
          {rulesData.faqs?.map((faq, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5"
            >
              <div className="flex items-start gap-2.5 font-bold text-sm text-slate-900">
                <HelpCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{faq.question}</span>
              </div>
              <p className="text-xs text-slate-600 pl-6 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-slate-900 text-white p-8 text-center space-y-3 shadow-md">
        <Title level={3} className="!text-xl !font-bold !text-white !mb-0">
          Bạn Muốn Thử Nghiệm Kỹ Thuật Bank Pool Tại Bàn Thực Tế?
        </Title>
        <Paragraph className="!text-xs !text-slate-400 !max-w-lg !mx-auto !mb-0">
          CLB CueZone luôn có sẵn các bàn chuẩn thi đấu (Min, Rasson) và đội ngũ trọng tài hỗ trợ
          hướng dẫn luật chi tiết.
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
