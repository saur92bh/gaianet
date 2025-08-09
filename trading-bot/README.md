# Trading Bot (ccxt + Python)

Quickstart:

1) Install Python 3.9+
2) Create a virtualenv (optional) and install deps:
   - `pip install -r requirements.txt`
3) Copy `.env.example` to `.env` and set values.
   - Keep `DRY_RUN=true` to avoid live orders.
   - Set `TESTNET=true` to use sandbox if the exchange supports it.
4) Run:
   - `python3 main.py`

Environment vars:
- `EXCHANGE` (e.g. binance, bybit, kraken)
- `SYMBOL` (e.g. BTC/USDT)
- `TIMEFRAME` (e.g. 1m, 5m)
- `ORDER_SIZE` (base amount, e.g. 0.001)
- `DRY_RUN` (true|false)
- `TESTNET` (true|false)
- `API_KEY`, `API_SECRET`

What it does:
- Fetches recent OHLCV data
- Computes SMA(10) and SMA(30)
- Emits a BUY or SELL signal when short SMA crosses long SMA
- If `DRY_RUN=false`, submits a market order accordingly