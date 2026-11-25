import React from "react";
import { RiseOutlined } from "@ant-design/icons";
import { Card, Tag, Typography } from "../../../../shared/ui";
import type { HourlyDataPoint, RevenueSplit } from "../types/dashboard.types";

const { Title, Text } = Typography;

interface PeakHoursWidgetProps {
  hourlyData: HourlyDataPoint[];
  revenueSplit: RevenueSplit;
}

export const PeakHoursWidget: React.FC<PeakHoursWidgetProps> = ({
  hourlyData,
  revenueSplit,
}) => {
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
    >
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <RiseOutlined className="text-base" />
          </div>
          <div>
            <Title
              level={4}
              className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
            >
              Khung Giờ Cao Điểm
            </Title>
            <Text className="!text-xs !text-slate-500 block whitespace-nowrap">
              Phân bổ mật độ doanh thu theo các mốc giờ trong ngày
            </Text>
          </div>
        </div>
        <Tag color="gold" className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-bold whitespace-nowrap">
          GIỜ CAO ĐIỂM
        </Tag>
      </div>

      <div className="p-4 sm:p-5">
        {/* Bar Chart Visual */}
        <div className="h-44 flex items-stretch justify-between gap-2 pt-6 pb-2 border-b border-slate-200">
          {hourlyData.map((d, idx) => (
            <div
              key={idx}
              className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative"
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded font-mono pointer-events-none whitespace-nowrap z-10 shadow-xs">
                {(d.revenue / 1000).toLocaleString()}k
              </div>

              <div className="w-full flex-1 flex items-end justify-center">
                <div
                  style={{ height: `${d.height}%` }}
                  className={`w-full max-w-[24px] min-h-[8px] rounded-t-md transition-all duration-300 ${
                    d.isPeak
                      ? "bg-emerald-500 group-hover:bg-emerald-600 shadow-xs ring-1 ring-emerald-400"
                      : "bg-slate-200 group-hover:bg-slate-300"
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                {d.hour.endsWith("h") ? d.hour : `${d.hour.split(":")[0]}h`}
              </span>
            </div>
          ))}
        </div>

        {/* Revenue category split */}
        <div className="pt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block whitespace-nowrap">Tiền Giờ Bàn</span>
            <strong className="text-slate-900 font-bold font-mono whitespace-nowrap">
              {revenueSplit.hasData ? `${revenueSplit.tablePercent}%` : "0%"}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[11px] text-emerald-800 block whitespace-nowrap">Đồ Uống & Cafe</span>
            <strong className="text-emerald-700 font-bold font-mono whitespace-nowrap">
              {revenueSplit.hasData ? `${revenueSplit.drinkPercent}%` : "0%"}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
            <span className="text-[11px] text-amber-800 block whitespace-nowrap">Ăn Vặt & Snack</span>
            <strong className="text-amber-800 font-bold font-mono whitespace-nowrap">
              {revenueSplit.hasData ? `${revenueSplit.snackPercent}%` : "0%"}
            </strong>
          </div>
        </div>
      </div>
    </Card>
  );
};
