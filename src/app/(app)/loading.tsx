export default function AppLoading() {
  return (
    <div>
      <div className="topbar">
        <div>
          <div className="skeleton" style={{ width: 160, height: 22, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 13 }} />
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div className="card kpi" key={i}>
            <div className="skeleton" style={{ width: "60%", height: 12 }} />
            <div className="skeleton" style={{ width: "40%", height: 26, marginTop: 14 }} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="skeleton" style={{ width: 140, height: 15, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "100%", height: 220 }} />
      </div>
    </div>
  );
}
