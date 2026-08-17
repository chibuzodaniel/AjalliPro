import dynamic from "next/dynamic";

function ChartSkeleton() {
  return <div className="skeleton" style={{ width: "100%", height: 220 }} />;
}

export const LineTrendChart = dynamic(() => import("./TrendChart").then((m) => m.LineTrendChart), {
  loading: ChartSkeleton,
});

export const BarTrendChart = dynamic(() => import("./TrendChart").then((m) => m.BarTrendChart), {
  loading: ChartSkeleton,
});
