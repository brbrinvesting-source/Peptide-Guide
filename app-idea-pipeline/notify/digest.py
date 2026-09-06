"""Builds the weekly top-ideas digest and sends it to Slack and/or email.

Slack: set SLACK_WEBHOOK_URL (see config.yaml notify.slack_webhook_env).
Email: set notify.email.enabled: true in config.yaml plus SMTP_HOST,
SMTP_PORT, SMTP_USER, SMTP_PASS, DIGEST_EMAIL_TO env vars.
"""
from __future__ import annotations

import os
import smtplib
import sys
from email.mime.text import MIMEText
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import load_config
from db.db import fetch_top_ideas, get_connection, init_db, mark_ideas_notified


def format_digest_markdown(ideas) -> str:
    if not ideas:
        return "No new app ideas cleared the score threshold this week."

    lines = ["*Top App Ideas This Week*\n"]
    for i, idea in enumerate(ideas, start=1):
        lines.append(
            f"{i}. *{idea['title']}* (score: {idea['overall_score']:.1f}, {idea['category']})\n"
            f"   {idea['description']}\n"
            f"   _Pain point:_ {idea['pain_point']}\n"
            f"   _Target user:_ {idea['target_user']}"
        )
    return "\n\n".join(lines)


def send_slack(webhook_url: str, message: str) -> None:
    resp = requests.post(webhook_url, json={"text": message}, timeout=15)
    resp.raise_for_status()


def send_email(cfg: dict, message: str) -> None:
    smtp_host = os.environ[cfg["smtp_host_env"]]
    smtp_port = int(os.environ.get(cfg["smtp_port_env"], "587"))
    smtp_user = os.environ[cfg["smtp_user_env"]]
    smtp_pass = os.environ[cfg["smtp_pass_env"]]
    to_addr = os.environ[cfg["to_env"]]

    mime_msg = MIMEText(message, "plain")
    mime_msg["Subject"] = "Weekly App Idea Digest"
    mime_msg["From"] = smtp_user
    mime_msg["To"] = to_addr

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [to_addr], mime_msg.as_string())


def run() -> int:
    cfg = load_config()
    conn = get_connection(cfg["database"]["path"])
    init_db(conn)

    notify_cfg = cfg["notify"]
    ideas = fetch_top_ideas(
        conn,
        min_score=cfg["scoring"]["score_threshold"],
        limit=notify_cfg["top_n"],
    )
    message = format_digest_markdown(ideas)
    print(message)

    slack_webhook = os.environ.get(notify_cfg["slack_webhook_env"])
    if slack_webhook:
        send_slack(slack_webhook, message)
        print("[digest] sent to Slack")

    if notify_cfg["email"]["enabled"]:
        send_email(notify_cfg["email"], message)
        print("[digest] sent via email")

    mark_ideas_notified(conn, [idea["id"] for idea in ideas])
    return len(ideas)


if __name__ == "__main__":
    run()
