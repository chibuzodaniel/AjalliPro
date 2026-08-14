export default function Pill({ status, children }: { status: "APPROVED" | "PENDING" | "REJECTED"; children: React.ReactNode }) {
  return <span className={`pill ${status}`}>{children}</span>;
}
