"""Pulls Google Trends interest-over-time data for configured keywords.

Trends data doesn't map to a single "idea" the way a Reddit post does, so
each keyword's latest data point is stored as one raw signal per pull,
letting the scorer flag rising/falling interest as supporting evidence.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from pytrends.request import TrendReq

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import load_config
from db.db import get_connection, init_db, insert_raw_signal


def run() -> int:
    cfg = load_config()
    conn = get_connection(cfg["database"]["path"])
    init_db(conn)

    trends_cfg = cfg["trends"]
    pytrends = TrendReq(hl="en-US", tz=360)

    inserted = 0
    keywords = trends_cfg["keywords"]
    # pytrends allows up to 5 keywords per request.
    for batch_start in range(0, len(keywords), 5):
        batch = keywords[batch_start : batch_start + 5]
        try:
            pytrends.build_payload(
                batch,
                timeframe=trends_cfg["timeframe"],
                geo=trends_cfg.get("geo", ""),
            )
            df = pytrends.interest_over_time()
        except Exception as e:
            print(f"[trends_pull] failed for {batch}: {e}")
            continue

        if df.empty:
            continue

        pulled_at = datetime.now(timezone.utc).isoformat()
        for keyword in batch:
            if keyword not in df.columns:
                continue
            series = df[keyword]
            row_id = insert_raw_signal(
                conn,
                source="trends",
                source_id=f"{keyword}:{pulled_at}",
                title=keyword,
                body=f"Interest over time for '{keyword}' ({trends_cfg['timeframe']}): "
                f"latest={series.iloc[-1]}, mean={series.mean():.1f}, max={series.max()}",
                url=None,
                metadata={
                    "timeframe": trends_cfg["timeframe"],
                    "geo": trends_cfg.get("geo", ""),
                    "latest_value": int(series.iloc[-1]),
                    "mean_value": round(float(series.mean()), 1),
                    "max_value": int(series.max()),
                },
            )
            if row_id:
                inserted += 1

    print(f"[trends_pull] inserted {inserted} new raw signals")
    return inserted


if __name__ == "__main__":
    run()
