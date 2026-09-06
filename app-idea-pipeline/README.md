# app-idea-pipeline

Finds and scores app ideas from public signals (App Store charts, competitor
app reviews, Reddit pain points, Google Trends), then emails/Slacks you a
weekly top-5 digest.

## Setup

```bash
cd app-idea-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Set environment variables as needed:

| Variable | Required for |
|---|---|
| `ANTHROPIC_API_KEY` | `scorer/score_ideas.py` |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` | `collectors/reddit_scanner.py` |
| `SLACK_WEBHOOK_URL` | `notify/digest.py` (Slack) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `DIGEST_EMAIL_TO` | `notify/digest.py` (email, if `notify.email.enabled: true` in config.yaml) |

Edit `config.yaml` to adjust subreddits, tracked competitor apps, keywords,
categories, and the score threshold that decides what makes the digest.

## Usage

```bash
python run_pipeline.py collect   # run all collectors
python run_pipeline.py score     # extract + score new raw signals with Claude
python run_pipeline.py notify    # send the digest for ideas above the threshold
python run_pipeline.py all       # all three, in order
```

Data lives in `db/ideas.db` (SQLite, gitignored — created automatically on
first run). Each stage is idempotent: collectors dedupe on `(source,
source_id)`, and the scorer only processes signals with no linked idea yet.

Wire `schedule` in `config.yaml` into cron or a scheduled GitHub Action to
run this unattended.
