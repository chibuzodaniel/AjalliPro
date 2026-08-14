export default function KpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  delta,
  deltaTone = "pos",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  delta?: React.ReactNode;
  deltaTone?: "pos" | "neg";
  onClick?: () => void;
}) {
  return (
    <div className="card kpi" style={onClick ? { cursor: "pointer" } : undefined} onClick={onClick}>
      <div className="top">
        {label}
        {icon && (
          <div className="icon" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
        )}
      </div>
      <div className="val">{value}</div>
      {delta && <span className={`delta ${deltaTone}`}>{delta}</span>}
    </div>
  );
}
