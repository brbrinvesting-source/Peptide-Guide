"""Runs the full pipeline end-to-end: collect -> score -> notify.

Usage: python run_pipeline.py [collect|score|notify|all]
Intended to be triggered by cron / a scheduled GitHub Action per the
schedule in config.yaml, rather than run as a long-lived process.
"""
from __future__ import annotations

import sys

from collectors import app_store_charts, reddit_scanner, review_miner, trends_pull
from notify import digest
from scorer import score_ideas


def run_collectors() -> None:
    for collector in (app_store_charts, review_miner, trends_pull):
        collector.run()
    try:
        reddit_scanner.run()
    except KeyError as e:
        print(f"[run_pipeline] skipping reddit_scanner, missing env var: {e}")


def main() -> None:
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"

    if stage in ("collect", "all"):
        run_collectors()
    if stage in ("score", "all"):
        score_ideas.run()
    if stage in ("notify", "all"):
        digest.run()


if __name__ == "__main__":
    main()
