"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "Mon", standard: 42, premium: 28 },
  { day: "Tue", standard: 38, premium: 32 },
  { day: "Wed", standard: 45, premium: 30 },
  { day: "Thu", standard: 40, premium: 35 },
  { day: "Fri", standard: 48, premium: 40 },
  { day: "Sat", standard: 52, premium: 45 },
  { day: "Sun", standard: 44, premium: 36 },
];

export function OccupancyTrendsChart() {
  return (
    <div className="h-[320px] min-h-[280px] min-w-0 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barCategoryGap="20%">
          <defs>
            <linearGradient id="barCyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9de2ff" />
              <stop offset="100%" stopColor="#00CCFF" />
            </linearGradient>
            <linearGradient id="barNavy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d4f6f" />
              <stop offset="100%" stopColor="#131B2E" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(157, 226, 255, 0.08)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "#9aa8bc", fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis tick={{ fill: "#9aa8bc", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0, 204, 255, 0.08)" }}
            contentStyle={{
              borderRadius: 14,
              border: "none",
              background: "#151b2b",
              color: "#e8eef8",
              boxShadow: "0px 16px 48px rgba(94, 212, 255, 0.12)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 16, color: "#9aa8bc" }} />
          <Bar dataKey="standard" stackId="a" fill="url(#barCyan)" radius={[0, 0, 0, 0]} name="STANDARD" />
          <Bar
            dataKey="premium"
            stackId="a"
            fill="url(#barNavy)"
            radius={[14, 14, 0, 0]}
            name="PREMIUM"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
