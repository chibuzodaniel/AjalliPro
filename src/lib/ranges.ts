import type { DailyRecordFull } from "./records";
import { currentWeekKey, weekKeyOf } from "./week";

export type RangeKey = "week" | "month" | "year" | "all" | "custom";

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "Overall" },
];

export function parseRange(value: string | undefined): RangeKey {
  return value === "week" || value === "month" || value === "year" || value === "all" || value === "custom"
    ? value
    : "week";
}

export interface CustomRange {
  from?: string;
  to?: string;
}

export function filterRecordsByRange(
  records: DailyRecordFull[],
  range: RangeKey,
  custom?: CustomRange
): DailyRecordFull[] {
  const now = new Date();
  return records.filter((r) => {
    if (range === "all") return true;
    if (range === "custom") {
      if (custom?.from && r.date < custom.from) return false;
      if (custom?.to && r.date > custom.to) return false;
      return Boolean(custom?.from || custom?.to);
    }
    const d = new Date(r.date + "T00:00:00");
    if (range === "week") return weekKeyOf(r.date) === currentWeekKey();
    if (range === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (range === "year") return d.getFullYear() === now.getFullYear();
    return true;
  });
}

export const RANGE_LABEL: Record<RangeKey, string> = {
  week: "this week",
  month: "this month",
  year: "this year",
  all: "overall",
  custom: "selected dates",
};
