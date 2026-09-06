"""Pulls top app charts from Apple's public iTunes RSS feeds.

No API key required. For each configured country/genre, fetches the chart
and stores each listed app as a raw signal (useful for spotting which
categories are heating up, and cross-referencing against review_miner).
"""
from __future__ import annotations

import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import load_config
from db.db import get_connection, init_db, insert_raw_signal

FEED_URL = "https://itunes.apple.com/{country}/rss/{chart}/limit={limit}/genre={genre}/json"


def fetch_chart(country: str, chart: str, genre: str, limit: int) -> list[dict]:
    url = FEED_URL.format(country=country, chart=chart, limit=limit, genre=genre)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    entries = resp.json().get("feed", {}).get("entry", [])
    return entries


def run() -> int:
    cfg = load_config()
    conn = get_connection(cfg["database"]["path"])
    init_db(conn)

    app_cfg = cfg["app_store"]
    inserted = 0
    for country in app_cfg["countries"]:
        for genre_id, genre_name in app_cfg["genres"].items():
            try:
                entries = fetch_chart(country, app_cfg["chart"], genre_id, app_cfg["limit"])
            except requests.RequestException as e:
                print(f"[app_store_charts] failed for {country}/{genre_name}: {e}")
                continue

            for rank, entry in enumerate(entries, start=1):
                app_id = entry.get("id", {}).get("attributes", {}).get("im:id")
                name = entry.get("im:name", {}).get("label")
                summary = entry.get("summary", {}).get("label", "")
                url = entry.get("link", {}).get("attributes", {}).get("href")
                if not app_id:
                    continue
                row_id = insert_raw_signal(
                    conn,
                    source="app_store_chart",
                    source_id=f"{country}:{genre_id}:{app_id}",
                    title=name,
                    body=summary,
                    url=url,
                    metadata={
                        "country": country,
                        "genre": genre_name,
                        "chart": app_cfg["chart"],
                        "rank": rank,
                    },
                )
                if row_id:
                    inserted += 1

    print(f"[app_store_charts] inserted {inserted} new raw signals")
    return inserted


if __name__ == "__main__":
    run()
