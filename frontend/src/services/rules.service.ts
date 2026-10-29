import api from "./api";
import type { ApiResponse } from "../types";

export interface BankPoolRuleScenario {
  id: string;
  name: string;
  category: "valid" | "foul" | "respot";
  tag: string;
  description: string;
  cushionsCount: number;
  cueBall: { x: number; y: number; label: string };
  objectBall: { x: number; y: number; label: string };
  aimPoint: { x: number; y: number; label: string };
  cushionPoints: { x: number; y: number }[];
  targetPocket: { x: number; y: number; name: string };
  foulReason?: string;
  isLegal: boolean;
}

export interface BankPoolRulesData {
  title: string;
  subtitle: string;
  standardOrg: string;
  summary: string;
  coreRules: {
    number: string;
    tag: string;
    color: string;
    title: string;
    content: string;
  }[];
  scenarios2D: BankPoolRuleScenario[];
  comparison: {
    legal: string[];
    fouls: string[];
  };
  cueBallAndScoring: {
    ballInHandRules: string[];
    respottingRules: string[];
    raceTargets: {
      gameType: string;
      targetScore: string;
      description: string;
    }[];
  };
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const rulesService = {
  async getBankPoolRules(): Promise<BankPoolRulesData> {
    try {
      const { data } = await api.get<ApiResponse<BankPoolRulesData>>("/public/bank-pool-rules");
      if (data.success && data.data) {
        return data.data;
      }
      throw new Error(data.message || "Không thể tải dữ liệu quy định");
    } catch (err) {
      console.warn("⚠️ API public/bank-pool-rules error, using fallback data:", err);
      return FALLBACK_RULES_DATA;
    }
  },
};

export const FALLBACK_RULES_DATA: BankPoolRulesData = {
  title: "Luật Thi Đấu Bida Bank Pool",
  subtitle: "Chuẩn Mực & Minh Bạch Theo Quy Định Quốc Tế WPA / BCA",
  standardOrg: "WPA / BCA Official Bank Pool Rules",
  summary:
    "Bank Pool (Bida dội băng) là thể loại bida đòi hỏi kỹ thuật hình học không gian, cảm giác băng và độ chuẩn xác lực tay cao nhất. Khám phá cẩm nang chi tiết dưới đây để sẵn sàng tham gia các trận thi đấu giải tại CueZone.",
  coreRules: [
    {
      number: "01",
      tag: "BẮT BUỘC",
      color: "green",
      title: "Quy Tắc Chạm Băng Bắt Buộc (Cushion First)",
      content:
        "Bi mục tiêu sau khi nhận lực từ bi cái bắt buộc phải dội vào ít nhất 1 thành băng rồi mới được rơi vào lỗ. Nếu bi mục tiêu đi thẳng trực tiếp vào lỗ (Straight-in Shot) mà không chạm băng, cú đánh bị xem là không hợp lệ; bi đó được nhặt đặt lại bàn và mất lượt đánh.",
    },
    {
      number: "02",
      tag: "CALL SHOT",
      color: "blue",
      title: "Luật Gọi Bi & Gọi Lỗ (Call Ball & Pocket)",
      content:
        'Cơ thủ phải tuyên bố rõ ràng: "Đánh bi số mấy vào lỗ nào" trước khi thực hiện cú đánh. Không cần thông báo số lần dội băng (1 băng, 2 băng dội ngang, 3 băng dội góc). Nếu bi mục tiêu vào đúng lỗ đã gọi, cơ thủ được tính điểm và tiếp tục đánh.',
    },
    {
      number: "03",
      tag: "PENALTY",
      color: "red",
      title: "Lỗi Phạm Quy & Phạt Bi (Fouls)",
      content:
        "Phạm quy gồm: Bi cái rơi vào lỗ (scratch), bi cái không chạm bi mục tiêu, bi văng khỏi mặt bàn, hoặc cơ thủ chạm tay/quần áo vào bi trên bàn. Cơ thủ phạm lỗi bị phạt trừ 01 bi điểm số đặt lại bàn, đối thủ nhận bi cái trong tay (Ball-in-hand) sau lằn giao bóng.",
    },
    {
      number: "04",
      tag: "RACE TO WIN",
      color: "gold",
      title: "Điều Kiện Chiến Thắng Ván Đấu",
      content:
        "Trong ván thi đấu chuẩn 9 bi tại CueZone, cơ thủ đầu tiên đưa thành công 5 bi hợp lệ vào lỗ sẽ là người chiến thắng ván đấu (Chạm 5). Trong thể thức 15 bi, mốc chiến thắng là 8 bi.",
    },
  ],
  scenarios2D: [
    {
      id: "cross-bank",
      name: "Dội 1 Băng Cắt Ngang (Cross Bank)",
      category: "valid",
      tag: "HỢP LỆ (+1 ĐIỂM)",
      description:
        "Bi cái chạm bi mục tiêu, đẩy bi mục tiêu dội vào thành băng dài đối diện và rơi thẳng vào lỗ giữa hoặc lỗ góc đã chỉ định. Đây là cú đánh cơ bản và phổ biến nhất.",
      cushionsCount: 1,
      isLegal: true,
      cueBall: { x: 260, y: 260, label: "Bi cái" },
      objectBall: { x: 420, y: 210, label: "Bi #3" },
      aimPoint: { x: 420, y: 210, label: "Điểm tiếp xúc" },
      cushionPoints: [{ x: 420, y: 40 }],
      targetPocket: { x: 400, y: 410, name: "Lỗ giữa dưới" },
    },
    {
      id: "double-bank",
      name: "Dội 2 Băng Chữ Z (Double Bank)",
      category: "valid",
      tag: "HỢP LỆ (+1 ĐIỂM)",
      description:
        "Bi mục tiêu dội qua 2 thành băng liên tiếp (băng dài rồi đến băng ngắn hoặc ngược lại) trước khi rơi vào lỗ đã gọi. Đòi hỏi tính toán góc phản xạ và áp-phê chính xác.",
      cushionsCount: 2,
      isLegal: true,
      cueBall: { x: 280, y: 320, label: "Bi cái" },
      objectBall: { x: 460, y: 260, label: "Bi #7" },
      aimPoint: { x: 460, y: 260, label: "Điểm tiếp xúc" },
      cushionPoints: [
        { x: 580, y: 40 },
        { x: 760, y: 225 },
      ],
      targetPocket: { x: 740, y: 410, name: "Lỗ góc dưới phải" },
    },
    {
      id: "long-bank",
      name: "Dội Băng Dài Xuyên Bàn (Long Bank)",
      category: "valid",
      tag: "HỢP LỆ (+1 ĐIỂM)",
      description:
        "Bi mục tiêu ở nửa bàn dưới dội vào băng ngắn đỉnh bàn rồi đi dọc chiều dài bàn đấu rơi vào lỗ góc đối diện. Cú đánh đòi hỏi lực tay đều và nỉ bàn đạt chuẩn thi đấu.",
      cushionsCount: 1,
      isLegal: true,
      cueBall: { x: 300, y: 160, label: "Bi cái" },
      objectBall: { x: 500, y: 160, label: "Bi #5" },
      aimPoint: { x: 500, y: 160, label: "Điểm tiếp xúc" },
      cushionPoints: [{ x: 760, y: 160 }],
      targetPocket: { x: 60, y: 160, name: "Lỗ góc trái" },
    },
    {
      id: "straight-in-foul",
      name: "Bắn Trực Tiếp Vào Lỗ Không Chạm Băng (Straight-in)",
      category: "foul",
      tag: "PHẠM QUY (KHÔNG TÍNH ĐIỂM)",
      description:
        "Bi mục tiêu đi thẳng vào lỗ mà không chạm vào bất kỳ thành băng nào. Trong luật Bank Pool, cú đánh này KHÔNG ĐƯỢC CÔNG NHẬN ĐIỂM; bi được vớt đặt lại bàn và mất lượt cơ.",
      cushionsCount: 0,
      isLegal: false,
      foulReason: "Bi mục tiêu không chạm bất kỳ thành băng nào trước khi vào lỗ.",
      cueBall: { x: 320, y: 280, label: "Bi cái" },
      objectBall: { x: 560, y: 360, label: "Bi #9" },
      aimPoint: { x: 560, y: 360, label: "Điểm tiếp xúc" },
      cushionPoints: [],
      targetPocket: { x: 740, y: 410, name: "Lỗ góc dưới phải" },
    },
  ],
  comparison: {
    legal: [
      "Bi mục tiêu dội 1 băng vào đúng lỗ đã gọi.",
      "Bi mục tiêu dội 2 băng (Double Bank) hoặc 3 băng vào đúng lỗ đã gọi.",
      "Sau khi bi mục tiêu rơi vào lỗ hợp lệ, các bi phụ khác rơi vào lỗ cũng được nhặt lại bàn mà không bị phạt.",
      "Cơ thủ đánh trúng bi mục tiêu hợp lệ, không có bi vào lỗ nhưng có ít nhất 1 bi chạm băng (không bị foul an toàn).",
    ],
    fouls: [
      "Bi mục tiêu đi thẳng trực tiếp vào lỗ mà không chạm băng (không tính điểm, đặt lại bi).",
      "Bi cái rơi vào bất kỳ lỗ nào trên bàn (Scratch - phạt trừ 1 bi).",
      "Bi mục tiêu rơi vào lỗ khác với lỗ đã gọi ban đầu (nhặt lại bi, mất lượt).",
      "Cơ thủ phạm quy 3 lần liên tiếp trong một ván đấu (xử thua ván đó ngay lập tức).",
      "Bi cái không chạm bi mục tiêu chỉ định hoặc văng ra khỏi thành bàn.",
    ],
  },
  cueBallAndScoring: {
    ballInHandRules: [
      "Sau khi đối thủ phạm lỗi (foul) hoặc bi cái rơi vào lỗ (scratch), cơ thủ tiếp theo nhận quyền bi cái trong tay (Ball-in-hand).",
      "Vị trí đặt bi cái: Toàn bộ khu vực phía sau lằn giao bóng (Head String / Kitchen).",
      "Quy tắc đánh: Bi cái phải được đánh hướng về phía trước vượt qua lằn giao bóng trước khi chạm vào bi mục tiêu hoặc dội băng.",
    ],
    respottingRules: [
      "Mọi bi rơi vào lỗ sai luật hoặc bi phạt trả nợ sẽ được nhặt ra và đặt lại tại Điểm Chân Bàn (Foot Spot).",
      "Nếu Điểm Chân Bàn bị vướng bởi một bi khác, bi nhặt ra sẽ được đặt nối tiếp phía sau dọc theo đường tâm bàn (Long String) hướng về phía băng ngắn đối diện.",
      "Nếu người chơi đang nợ điểm (-1, -2), bi hợp lệ đưa vào lỗ kế tiếp sẽ dùng để thanh toán khoản nợ phạt này trước khi bắt đầu tính điểm dương.",
    ],
    raceTargets: [
      {
        gameType: "Thể thức 9 Bi Bank Pool",
        targetScore: "Chạm 5 (Race to 5)",
        description: "Ván đấu kết thúc ngay khi một cơ thủ đưa thành công 5 bi hợp lệ vào lỗ.",
      },
      {
        gameType: "Thể thức 15 Bi Bank Pool",
        targetScore: "Chạm 8 (Race to 8)",
        description: "Ván đấu kết thúc ngay khi một cơ thủ đưa thành công 8 bi hợp lệ vào lỗ.",
      },
      {
        gameType: "Thi Đấu Trận / Match Play",
        targetScore: "Race to 3 Ván (Best of 5)",
        description: "Cơ thủ thắng trước 3 ván đấu sẽ giành chiến thắng chung cuộc trận đấu giải.",
      },
    ],
  },
  faqs: [
    {
      question: "Bi mục tiêu chạm 2 băng hoặc 3 băng rồi mới vào lỗ đã gọi thì có tính điểm không?",
      answer:
        "CÓ. Trong luật Bank Pool quốc tế, bạn chỉ cần chỉ định số bi và lỗ dự định đưa vào. Bi mục tiêu chạm từ 1 băng trở lên (1 băng, 2 băng, 3 băng dội) và rơi đúng lỗ đã gọi đều được tính là cú đánh hợp lệ và ghi 01 điểm.",
    },
    {
      question:
        "Nếu bi mục tiêu va chạm vào bi khác (Kiss/Carom) trước khi dội băng thì có hợp lệ không?",
      answer:
        "KHÔNG. Cú đánh Bank Pool chuẩn yêu cầu bi cái truyền lực trực tiếp vào bi mục tiêu, và bi mục tiêu dội vào băng sạch sẽ trước khi vào lỗ. Mọi va chạm không chủ ý làm đổi hướng trước khi chạm băng đều không được công nhận.",
    },
    {
      question: "Khi phạm quy (Foul), nếu tôi chưa ghi được điểm nào (0 điểm) thì phạt thế nào?",
      answer:
        "Khi phạm lỗi mà bạn chưa có bi nào trong rổ điểm (0 bi), bạn sẽ bị ghi nhận 'nợ 1 bi' (-1). Ngay khi bạn đưa được bi hợp lệ tiếp theo vào lỗ, bi đó sẽ bị tịch thu đặt lại điểm Foot Spot để trả nợ phạt.",
    },
    {
      question: "Bi cái rơi vào lỗ (Scratch) thì đối thủ đánh tiếp ở vị trí nào?",
      answer:
        "Đối thủ được hưởng quyền bi cái trong tay (Ball-in-hand) đặt tại bất kỳ vị trí nào phía sau lằn giao bóng (Head String / Kitchen) và phải đánh bi cái vượt qua lằn giao bóng.",
    },
  ],
};
