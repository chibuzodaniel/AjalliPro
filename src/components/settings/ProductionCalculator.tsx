"use client";

import { useState } from "react";

export default function ProductionCalculator({ currentStock }: { currentStock: number }) {
  const [expected, setExpected] = useState("");
  const [buffer, setBuffer] = useState("15");
  const [result, setResult] = useState<number | null>(null);

  function calc() {
    const demand = Number(expected) || 0;
    const bufferPct = Number(buffer) || 0;
    const needed = Math.max(0, Math.ceil(demand * (1 + bufferPct / 100) - currentStock));
    setResult(needed);
  }

  return (
    <div>
      <div className="form-grid">
        <div className="field">
          <label>Expected demand today (bags)</label>
          <input type="number" placeholder="e.g. 1200" value={expected} onChange={(e) => setExpected(e.target.value)} />
        </div>
        <div className="field">
          <label>Safety buffer (%)</label>
          <input type="number" value={buffer} onChange={(e) => setBuffer(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-ghost" onClick={calc}>
        Calculate requirement
      </button>
      {result !== null && (
        <div className="calc-box" style={{ marginTop: 14 }}>
          <span>Recommended production today</span>
          <b>{result} bags</b>
        </div>
      )}
    </div>
  );
}
