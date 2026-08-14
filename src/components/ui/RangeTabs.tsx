import Link from "next/link";

export default function RangeTabs({
  basePath,
  current,
  options,
  paramName = "range",
}: {
  basePath: string;
  current: string;
  options: { value: string; label: string }[];
  paramName?: string;
}) {
  return (
    <div className="tabs no-print">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={`${basePath}?${paramName}=${opt.value}`}
          className={`tab-btn ${current === opt.value ? "active" : ""}`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
