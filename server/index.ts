import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT || 5174);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function symbolToBinance(symbol: string): string {
  // e.g. BTC/USDT -> BTCUSDT ; eth/usdt -> ETHUSDT
  const parts = symbol.split("/");
  if (parts.length === 2) {
    return `${parts[0]}${parts[1]}`.replace(/[^A-Za-z]/g, "").toUpperCase();
  }
  return symbol.replace(/[^A-Za-z]/g, "").toUpperCase();
}

app.get("/api/price", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "BTC/USDT";
    const binanceSymbol = symbolToBinance(symbol);
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(502).json({ error: `Binance responded ${r.status}` });
    }
    const data = await r.json();
    res.json({ symbol, price: Number(data.price) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.get("/api/stream", async (req, res) => {
  const symbol = (req.query.symbol as string) || "BTC/USDT";
  const binanceSymbol = symbolToBinance(symbol);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let isClosed = false;
  req.on("close", () => {
    isClosed = true;
  });

  const sendEvent = (event: string, payload: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent("info", { message: "stream-start", symbol });

  const interval = setInterval(async () => {
    if (isClosed) {
      clearInterval(interval);
      return;
    }
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
      const r = await fetch(url);
      if (!r.ok) return;
      const data = (await r.json()) as { price: string };
      sendEvent("tick", { symbol, price: Number(data.price), ts: Date.now() });
    } catch {
      // ignore transient errors
    }
  }, 1500);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});