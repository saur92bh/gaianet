import os
import time
from typing import List

import ccxt  # type: ignore
from dotenv import load_dotenv  # type: ignore


def to_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    value_lower = value.strip().lower()
    return value_lower in {"1", "true", "yes", "y", "on"}


def compute_sma(values: List[float], window: int) -> float:
    if len(values) < window:
        raise ValueError(f"Need at least {window} values to compute SMA")
    return sum(values[-window:]) / float(window)


def get_env(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value if value is not None and value != "" else default


def main() -> None:
    load_dotenv()

    exchange_id = get_env("EXCHANGE", "binance").lower()
    symbol = get_env("SYMBOL", "BTC/USDT")
    timeframe = get_env("TIMEFRAME", "1m")
    order_size_str = get_env("ORDER_SIZE", "0.001")
    dry_run = to_bool(get_env("DRY_RUN", "true"), True)
    use_testnet = to_bool(get_env("TESTNET", "true"), True)

    api_key = get_env("API_KEY")
    api_secret = get_env("API_SECRET")

    try:
        order_size = float(order_size_str)
    except Exception:
        raise SystemExit(f"Invalid ORDER_SIZE: {order_size_str}")

    if not hasattr(ccxt, exchange_id):
        raise SystemExit(f"Unknown exchange: {exchange_id}")

    exchange_class = getattr(ccxt, exchange_id)
    exchange = exchange_class({
        "apiKey": api_key or None,
        "secret": api_secret or None,
        "enableRateLimit": True,
        # Most spot exchanges default to spot. Some require setting defaultType.
        "options": {
            "defaultType": "spot"
        }
    })

    if hasattr(exchange, "set_sandbox_mode"):
        try:
            exchange.set_sandbox_mode(use_testnet)
        except Exception:
            # Not all exchanges support sandbox; ignore.
            pass

    print(f"Exchange: {exchange_id}\nSymbol: {symbol}\nTimeframe: {timeframe}\nDry run: {dry_run}\nTestnet: {use_testnet}")

    # Fetch candles and compute SMAs
    limit = 100
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
    except Exception as exc:
        raise SystemExit(f"Failed to fetch OHLCV for {symbol} on {exchange_id}: {exc}")

    if len(ohlcv) < 35:
        raise SystemExit(f"Not enough candles returned (got {len(ohlcv)}), need at least 35")

    closes = [candle[4] for candle in ohlcv]

    sma_short_window = 10
    sma_long_window = 30

    sma_short_prev = compute_sma(closes[:-1], sma_short_window)
    sma_long_prev = compute_sma(closes[:-1], sma_long_window)

    sma_short_now = compute_sma(closes, sma_short_window)
    sma_long_now = compute_sma(closes, sma_long_window)

    action = "HOLD"
    if sma_short_prev <= sma_long_prev and sma_short_now > sma_long_now:
        action = "BUY"
    elif sma_short_prev >= sma_long_prev and sma_short_now < sma_long_now:
        action = "SELL"

    last_close = closes[-1]

    print(
        f"Last close={last_close:.2f} | SMA{"%d" % sma_short_window}={sma_short_now:.2f} "
        f"SMA{"%d" % sma_long_window}={sma_long_now:.2f} | Signal={action}"
    )

    if action == "HOLD":
        return

    if dry_run:
        print("DRY_RUN is true -> no live orders will be placed.")
        return

    if not api_key or not api_secret:
        raise SystemExit("API_KEY and API_SECRET are required when DRY_RUN=false")

    side = "buy" if action == "BUY" else "sell"

    # Place a market order
    try:
        order = exchange.create_order(symbol=symbol, type="market", side=side, amount=order_size)
        print("Order placed:")
        print(order)
    except Exception as exc:
        raise SystemExit(f"Failed to place order: {exc}")


if __name__ == "__main__":
    main()