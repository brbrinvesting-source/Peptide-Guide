# Member loan ledger

Tracks the loan from the LLC's member (personal funds) to the Company, formalized in a Member
Loan Agreement, and any repayments made from the Company's bank account back to the member's
personal account once that account exists and holds funds. This is the paper trail that shows a
personal-guarantee-style debt was actually repaid by the business rather than quietly absorbed —
update it any time a repayment happens (tell Claude the date and amount).

The underlying itemized advances live in `docs/business-expenses.md` — this file tracks the loan
balance and its repayment, not the individual purchases.

## Advances (loan principal)

| Date | Amount | Running balance owed to member |
|---|---|---|
| 2026-08-20 through 2026-11-16 | $774.93 | $774.93 |

## Repayments

| Date | Amount | From / to | Running balance owed to member | Notes |
|---|---|---|---|---|
| 2026-11-16 | $774.93 | Revenue recognition, not a bank transfer — see note | $0.00 | Satisfied via pre-launch P2P sales (Venmo) made directly to the member's personal account/Venmo before the business bank account existed and before the site was taking orders. No business-to-personal transfer actually occurred — the funds never left personal hands, so this is a bookkeeping designation (this revenue counts as repaying the loan rather than as a distribution/profit), not bank-trail evidence of a true repayment. Flag this treatment to your accountant. |

**Going forward:** once the business bank account is open, route all revenue (site sales via
Stripe payout, and any further P2P/Venmo sales) into it directly rather than personal Venmo/
accounts, and use the clean transfer-with-memo method described below for anything that still
needs to move to personal — this pre-launch period is a one-time, practically unavoidable
exception, not a pattern to continue.

## How to actually show a repayment happened

1. Transfer the repayment amount from the Company's business bank account directly to the
   member's personal account — never cash, and never routed through a third party.
2. Put something identifiable in the transfer's memo/description, e.g. "Member Loan Repayment —
   All-Access Peptides LLC."
3. Log it in the Repayments table above (date, amount, running balance) the same day.
4. Keep the bank statement/transfer confirmation showing both sides of the transfer (the Company
   account debit and the personal account credit) — that's the actual evidence if it's ever
   questioned, this ledger is just the index pointing to it.

This isn't a substitute for how your accountant actually records the loan and its repayment on
the Company's books (as a reduction of a loan-payable liability, not an expense or a
distribution) — this is just the plain-English tracking copy.
