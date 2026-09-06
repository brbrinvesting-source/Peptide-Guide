"""Mines 1-3 star reviews from competitor apps via Apple's public RSS review feed.

No API key required. Low-star reviews are a rich source of unmet needs and
"I wish this app also did X" complaints.
"""
from __future__ import annotations

import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import load_config
from db.db import get_connection, init_db, insert_raw_signal

FEED_URL = "https://itunes.apple.com/{country}/rss/customerreviews/id={app_id}/sortby=mostrecent/json"


def fetch_reviews(country: str, app_id: str) -> list[dict]:
    url = FEED_URL.format(country=country, app_id=app_id)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    entries = resp.json().get("feed", {}).get("entry", [])
    # The first entry is the app metadata itself, not a review, when present.
    return [e for e in entries if "im:rating" in e]


def run() -> int:
    cfg = load_config()
    conn = get_connection(cfg["database"]["path"])
    init_db(conn)

    rm_cfg = cfg["review_miner"]
    inserted = 0
    for country in rm_cfg["countries"]:
        for app in rm_cfg["apps"]:
            try:
                reviews = fetch_reviews(country, app["id"])
            except requests.RequestException as e:
                print(f"[review_miner] failed for {app['name']}: {e}")
                continue

            for review in reviews:
                rating = int(review.get("im:rating", {}).get("label", 5))
                if not (rm_cfg["min_rating"] <= rating <= rm_cfg["max_rating"]):
                    continue

                review_id = review.get("id", {}).get("label")
                title = review.get("title", {}).get("label")
                body = review.get("content", {}).get("label")
                if not review_id:
                    continue

                row_id = insert_raw_signal(
                    conn,
                    source="review",
                    source_id=review_id,
                    title=title,
                    body=body,
                    url=None,
                    metadata={
                        "app_name": app["name"],
                        "app_id": app["id"],
                        "country": country,
                        "rating": rating,
                    },
                )
                if row_id:
                    inserted += 1

    print(f"[review_miner] inserted {inserted} new raw signals")
    return inserted


if __name__ == "__main__":
    run()
