'use client'

import { useActionState, useState } from 'react'
import { sendBroadcastAction, sendTestBroadcastAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export function BroadcastForm({ recipientCount }: { recipientCount: number }) {
  const [testState, testAction] = useActionState<AdminActionState, FormData>(sendTestBroadcastAction, {})
  const [sendState, sendAction] = useActionState<AdminActionState, FormData>(sendBroadcastAction, {})
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="panel space-y-4 p-5">
        <label className="microlabel block">
          Subject
          <input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
            className="field mt-1.5"
            placeholder="e.g. New compounds just added to the catalog"
            form="broadcast-send-form"
          />
        </label>
        <label className="microlabel block">
          Body
          <textarea
            name="bodyText"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={14}
            required
            className="field mt-1.5"
            placeholder={'Plain text. Leave a blank line between paragraphs.\n\nLinks (https://...) work as plain text — write the full URL.'}
            form="broadcast-send-form"
          />
          <span className="mt-1 block text-[0.65rem] normal-case text-muted">
            Plain text only — a blank line starts a new paragraph. Research-use disclaimer, your
            mailing address, and an unsubscribe link are added automatically.
          </span>
        </label>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <form action={testAction} className="contents">
            <input type="hidden" name="subject" value={subject} />
            <input type="hidden" name="bodyText" value={bodyText} />
            <SubmitButton
              className="btn btn-outline btn-sm"
              pendingLabel="Sending test…"
              disabled={!subject.trim() || !bodyText.trim()}
            >
              Send test to myself
            </SubmitButton>
          </form>
        </div>
        {testState.error && <Alert kind="error">{testState.error}</Alert>}
        {testState.success && <Alert kind="success">{testState.success}</Alert>}
      </div>

      <aside className="panel h-fit space-y-4 p-5">
        <p className="microlabel text-gold">Send to everyone</p>
        <p className="text-sm">
          <span className="text-2xl font-bold">{recipientCount}</span>{' '}
          <span className="text-muted">eligible recipient{recipientCount === 1 ? '' : 's'}</span>
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Verified, active accounts that haven&apos;t opted out of marketing emails. Send a test
          to yourself first — this can&apos;t be undone once it goes out.
        </p>
        <form
          id="broadcast-send-form"
          action={sendAction}
          onSubmit={(e) => {
            if (!confirm(`Send this email to all ${recipientCount} eligible customers? This can't be undone.`)) {
              e.preventDefault()
            }
          }}
          className="space-y-3"
        >
          <label className="flex items-start gap-2 text-xs leading-relaxed">
            <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4 accent-[#c9a961]" required />
            I&apos;ve sent myself a test and reviewed it.
          </label>
          <SubmitButton
            className="btn btn-gold btn-sm w-full"
            pendingLabel="Sending…"
            disabled={!subject.trim() || !bodyText.trim() || recipientCount === 0}
          >
            Send to {recipientCount} customer{recipientCount === 1 ? '' : 's'}
          </SubmitButton>
        </form>
        {sendState.error && <Alert kind="error">{sendState.error}</Alert>}
        {sendState.success && <Alert kind="success">{sendState.success}</Alert>}
      </aside>
    </div>
  )
}
