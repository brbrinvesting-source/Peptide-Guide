"""Scans target subreddits for posts that look like app pain points / requests.

Requires REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT env vars
(create a "script" app at https://www.reddit.com/prefs/apps).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import praw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import load_config
from db.db import get_connection, init_db, insert_raw_signal


def get_reddit_client() -> praw.Reddit:
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        user_agent=os.environ.get("REDDIT_USER_AGENT", "app-idea-pipeline/0.1"),
    )


def matches_pain_point(text: str, keywords: list[str]) -> bool:
    lowered = text.lower()
    return any(keyword.lower() in lowered for keyword in keywords)


def run() -> int:
    cfg = load_config()
    conn = get_connection(cfg["database"]["path"])
    init_db(conn)

    reddit_cfg = cfg["reddit"]
    reddit = get_reddit_client()

    inserted = 0
    for subreddit_name in reddit_cfg["subreddits"]:
        subreddit = reddit.subreddit(subreddit_name)
        listing = getattr(subreddit, reddit_cfg.get("listing", "hot"))
        try:
            posts = listing(limit=reddit_cfg["post_limit_per_subreddit"])
        except Exception as e:  # praw raises various prawcore exceptions
            print(f"[reddit_scanner] failed for r/{subreddit_name}: {e}")
            continue

        for post in posts:
            combined_text = f"{post.title}\n{post.selftext or ''}"
            if not matches_pain_point(combined_text, reddit_cfg["pain_point_keywords"]):
                continue

            row_id = insert_raw_signal(
                conn,
                source="reddit",
                source_id=post.id,
                title=post.title,
                body=post.selftext,
                url=f"https://reddit.com{post.permalink}",
                metadata={
                    "subreddit": subreddit_name,
                    "score": post.score,
                    "num_comments": post.num_comments,
                    "created_utc": post.created_utc,
                },
            )
            if row_id:
                inserted += 1

    print(f"[reddit_scanner] inserted {inserted} new raw signals")
    return inserted


if __name__ == "__main__":
    run()
