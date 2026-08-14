"use client";

import "./chartSetup";
import { Line, Bar } from "react-chartjs-2";

export interface ChartSeries {
  label: string;
  data: (number | null)[];
  color: string;
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#A79FC9", font: { size: 11 } } },
  },
  scales: {
    x: { ticks: { color: "#6F6693", font: { size: 10 } }, grid: { color: "#241E3D" } },
    y: { ticks: { color: "#6F6693", font: { size: 10 } }, grid: { color: "#241E3D" } },
  },
};

export function LineTrendChart({ labels, series }: { labels: string[]; series: ChartSeries[] }) {
  return (
    <div className="chart-wrap">
      <Line
        data={{
          labels,
          datasets: series.map((s) => ({
            label: s.label,
            data: s.data,
            borderColor: s.color,
            backgroundColor: s.color + "33",
            tension: 0.35,
            fill: true,
            pointRadius: 2,
          })),
        }}
        options={baseOptions}
      />
    </div>
  );
}

export function BarTrendChart({ labels, series }: { labels: string[]; series: ChartSeries[] }) {
  return (
    <div className="chart-wrap">
      <Bar
        data={{
          labels,
          datasets: series.map((s) => ({
            label: s.label,
            data: s.data,
            backgroundColor: s.color + "cc",
            borderRadius: 6,
          })),
        }}
        options={baseOptions}
      />
    </div>
  );
}
