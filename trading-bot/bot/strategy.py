from typing import List


def simple_moving_average(values: List[float], window: int) -> float:
    if len(values) < window:
        raise ValueError(f"Need at least {window} values to compute SMA")
    return sum(values[-window:]) / float(window)