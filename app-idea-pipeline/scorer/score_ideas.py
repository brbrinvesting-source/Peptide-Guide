"""Calls the Claude API to extract + score app ideas out of raw signals.

Requires ANTHROPIC_API_KEY env var.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import load_config
from db.db import fetch_unscored_signals, get_connection, init_db, insert_idea
from scorer.extract_prompt import SYSTEM_PROMPT, build_user_prompt


def extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[1] if "\n" in text else text
    return json.loads(text)


def score_signal(client: anthropic.Anthropic, model: str, signal) -> dict | None:
    metadata = json.loads(signal["metadata"] or "{}")
    user_prompt = build_user_prompt(signal["source"], signal["title"], signal["body"], metadata)

    response = client.messages.create(
        model=model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    raw_text = "".join(block.text for block in response.content if block.type == "text")

    try:
        parsed = extract_json(raw_text)
    except (json.JSONDecodeError, IndexError) as e:
        print(f"[score_ideas] failed to parse model output for signal {signal['id']}: {e}")
        return None

    return parsed.get("idea")


def run() -> int:
    cfg = load_config()
    conn = get_connection(cfg["database"]["path"])
    init_db(conn)

    client = anthropic.Anthropic()
    model = cfg["scoring"]["model"]

    signals = fetch_unscored_signals(conn)
    scored = 0
    for signal in signals:
        idea = score_signal(client, model, signal)
        if not idea:
            continue
        insert_idea(conn, signal["id"], idea)
        scored += 1

    print(f"[score_ideas] scored {scored}/{len(signals)} pending signals into ideas")
    return scored


if __name__ == "__main__":
    run()
