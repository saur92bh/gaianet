import { useEffect, useMemo, useRef, useState } from "react";

export default function RealTimeCryptoTradingBot() {
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [running, setRunning] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const streamUrl = useMemo(() => {
    const params = new URLSearchParams({ symbol });
    return `/api/stream?${params.toString()}`;
  }, [symbol]);

  useEffect(() => {
    if (!running) return;

    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    const onInfo = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setLog((prev) => [
          `[info] ${data.message} ${data.symbol ? `(${data.symbol})` : ""}`,
          ...prev
        ].slice(0, 200));
      } catch {}
    };
    const onTick = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { price: number; ts: number };
        setPrice(data.price);
      } catch {}
    };

    es.addEventListener("info", onInfo);
    es.addEventListener("tick", onTick);

    es.onerror = () => {
      setLog((prev) => ["[error] stream error", ...prev].slice(0, 200));
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [running, streamUrl]);

  const toggle = () => {
    if (running) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setRunning(false);
    } else {
      setLog([]);
      setRunning(true);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 680 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>
          Symbol:
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTC/USDT"
            style={{ marginLeft: 8 }}
          />
        </label>
        <button onClick={toggle}>{running ? "Stop" : "Start"}</button>
      </div>

      <div style={{ fontSize: 32, fontWeight: 700 }}>
        {price ? `${symbol} ${price.toFixed(2)}` : "—"}
      </div>

      <details>
        <summary>Log</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>
{log.map((l, i) => (
  <div key={i}>{l}</div>
))}
        </pre>
      </details>

      <p style={{ color: "#777" }}>
        This demo streams prices from Binance public API via the local backend. No live orders are placed.
      </p>
    </div>
  );
}