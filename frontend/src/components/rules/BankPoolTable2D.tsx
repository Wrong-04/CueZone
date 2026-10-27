import React from "react";
import type { BankPoolRuleScenario } from "../../services/rules.service";

interface BankPoolTable2DProps {
  scenario: BankPoolRuleScenario;
  onSelectScenario?: (scenario: BankPoolRuleScenario) => void;
}

export const BankPoolTable2D: React.FC<BankPoolTable2DProps> = ({
  scenario,
}) => {
  const { cueBall, objectBall, cushionPoints, targetPocket, isLegal } = scenario;

  // Xây dựng path SVG cho quỹ đạo bi mục tiêu
  // Bắt đầu từ vị trí bi mục tiêu -> qua các điểm chạm băng -> vào lỗ đích
  let objectBallPath = `M ${objectBall.x} ${objectBall.y}`;
  cushionPoints.forEach((pt) => {
    objectBallPath += ` L ${pt.x} ${pt.y}`;
  });
  objectBallPath += ` L ${targetPocket.x} ${targetPocket.y}`;

  // Đường bi cái đi đến bi mục tiêu
  const cueBallPath = `M ${cueBall.x} ${cueBall.y} L ${objectBall.x} ${objectBall.y}`;

  return (
    <div className="w-full bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 text-white select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                isLegal
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}
            >
              {scenario.tag}
            </span>
            <span className="text-xs text-slate-400">
              {scenario.cushionsCount > 0
                ? `${scenario.cushionsCount} Băng Dội`
                : "Không Chạm Băng"}
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white mt-1">
            {scenario.name}
          </h4>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-white border border-slate-300 inline-block" />
            <span>Bi cái</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
            <span>Bi mục tiêu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
            <span>Điểm chạm băng</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas bàn bida 2D */}
      <div className="relative w-full aspect-[800/450] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <svg
          viewBox="0 0 800 450"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Lớp nền nỉ bida xanh Simonis */}
            <radialGradient id="feltGrad" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>

            {/* Khung gỗ thành bàn */}
            <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="50%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>

            {/* Mũi tên dẫn hướng */}
            <marker
              id="arrowValid"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#34d399" />
            </marker>
            <marker
              id="arrowFoul"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#f87171" />
            </marker>
            <marker
              id="arrowCue"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#ffffff" />
            </marker>
          </defs>

          {/* 1. KHUNG GỖ THÀNH BÀN (Outer Cushion Frame) */}
          <rect
            x="10"
            y="10"
            width="780"
            height="430"
            rx="18"
            fill="url(#woodGrad)"
            stroke="#1c1917"
            strokeWidth="4"
          />

          {/* 2. MẶT NỈ THI ĐẤU (Inner Playing Felt Surface) */}
          <rect
            x="40"
            y="40"
            width="720"
            height="370"
            rx="8"
            fill="url(#feltGrad)"
          />

          {/* 3. VẠCH LẰN GIAO BÓNG (Head String / Kitchen Area) */}
          <line
            x1="220"
            y1="40"
            x2="220"
            y2="410"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text
            x="130"
            y="230"
            fill="rgba(255, 255, 255, 0.3)"
            fontSize="11"
            fontWeight="bold"
            letterSpacing="2"
            textAnchor="middle"
          >
            KITCHEN / KHU VỰC BI CÁI
          </text>

          {/* 4. ĐIỂM CHÂN BÀN & ĐIỂM TÂM BÀN (Foot Spot & Center Spot) */}
          {/* Tâm bàn */}
          <circle cx="400" cy="225" r="3" fill="rgba(255, 255, 255, 0.4)" />
          {/* Điểm chân bàn (Foot spot) */}
          <circle cx="580" cy="225" r="4" fill="rgba(255, 255, 255, 0.7)" />
          <text
            x="580"
            y="245"
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            FOOT SPOT
          </text>

          {/* 5. CÁC NÚT ĐIỂM BĂNG (Diamonds) TRÊN THÀNH BÀN */}
          {/* Băng trên & Băng dưới */}
          {[130, 220, 310, 400, 490, 580, 670].map((dx, i) => (
            <React.Fragment key={`dia-top-${i}`}>
              <circle cx={dx} cy="25" r="2.5" fill="#fef08a" />
              <circle cx={dx} cy="425" r="2.5" fill="#fef08a" />
            </React.Fragment>
          ))}
          {/* Băng trái & Băng phải */}
          {[132, 225, 318].map((dy, i) => (
            <React.Fragment key={`dia-side-${i}`}>
              <circle cx="25" cy={dy} r="2.5" fill="#fef08a" />
              <circle cx="775" cy={dy} r="2.5" fill="#fef08a" />
            </React.Fragment>
          ))}

          {/* 6. CÁC TÚI LỖ (Pockets) */}
          {/* 4 Lỗ góc */}
          <circle cx="44" cy="44" r="16" fill="#09090b" stroke="#27272a" strokeWidth="2" />
          <circle cx="756" cy="44" r="16" fill="#09090b" stroke="#27272a" strokeWidth="2" />
          <circle cx="44" cy="406" r="16" fill="#09090b" stroke="#27272a" strokeWidth="2" />
          <circle cx="756" cy="406" r="16" fill="#09090b" stroke="#27272a" strokeWidth="2" />
          {/* 2 Lỗ giữa */}
          <circle cx="400" cy="38" r="14" fill="#09090b" stroke="#27272a" strokeWidth="2" />
          <circle cx="400" cy="412" r="14" fill="#09090b" stroke="#27272a" strokeWidth="2" />

          {/* 7. QUỸ ĐẠO CÚ ĐÁNH (Shot Trajectories) */}
          {/* Đường chạy của bi cái đến bi mục tiêu */}
          <path
            d={cueBallPath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="5 4"
            markerEnd="url(#arrowCue)"
          />

          {/* Quỹ đạo bi mục tiêu */}
          <path
            d={objectBallPath}
            fill="none"
            stroke={isLegal ? "#34d399" : "#f87171"}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={isLegal ? "url(#arrowValid)" : "url(#arrowFoul)"}
          />

          {/* Các điểm chạm băng (Cushion contact points) */}
          {cushionPoints.map((cp, idx) => (
            <g key={`cp-${idx}`}>
              <circle
                cx={cp.x}
                cy={cp.y}
                r="7"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={cp.x}
                y={cp.y > 225 ? cp.y - 12 : cp.y + 18}
                fill="#a7f3d0"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                Băng #{idx + 1}
              </text>
            </g>
          ))}

          {/* 8. CÁC BI BIDA TRÊN MẶT BÀN */}
          {/* Bi cái (Cue Ball) */}
          <circle
            cx={cueBall.x}
            cy={cueBall.y}
            r="11"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <circle cx={cueBall.x} cy={cueBall.y} r="2" fill="#ef4444" />
          <text
            x={cueBall.x}
            y={cueBall.y + 24}
            fill="#ffffff"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {cueBall.label}
          </text>

          {/* Bi mục tiêu (Object Ball) */}
          <circle
            cx={objectBall.x}
            cy={objectBall.y}
            r="11"
            fill="#f59e0b"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <text
            x={objectBall.x}
            y={objectBall.y + 4}
            fill="#000000"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            {objectBall.label.replace(/[^0-9]/g, "") || "●"}
          </text>
          <text
            x={objectBall.x}
            y={objectBall.y - 16}
            fill="#fde68a"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {objectBall.label}
          </text>

          {/* Lỗ mục tiêu được gọi (Target Pocket Glow) */}
          <circle
            cx={targetPocket.x}
            cy={targetPocket.y}
            r="18"
            fill="none"
            stroke={isLegal ? "#10b981" : "#ef4444"}
            strokeWidth="3"
            strokeDasharray="4 2"
          />
          <text
            x={targetPocket.x}
            y={targetPocket.y > 225 ? targetPocket.y + 24 : targetPocket.y - 16}
            fill={isLegal ? "#34d399" : "#f87171"}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            🎯 {targetPocket.name}
          </text>
        </svg>
      </div>

      {/* Chú giải tình huống bên dưới sơ đồ */}
      <div className="mt-4 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
        <p className="font-semibold text-slate-200">
          Diễn giải: <span className="font-normal text-slate-300">{scenario.description}</span>
        </p>
        {!isLegal && scenario.foulReason && (
          <p className="text-rose-400 font-medium">
            ⚠️ Lý do phạm quy: {scenario.foulReason}
          </p>
        )}
      </div>
    </div>
  );
};
