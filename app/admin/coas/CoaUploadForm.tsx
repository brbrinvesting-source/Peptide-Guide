'use client'

import { useActionState } from 'react'
import { uploadCoaAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export function CoaUploadForm({
  products,
  defaultProductId,
}: {
  products: { id: string; label: string }[]
  defaultProductId?: string
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(uploadCoaAction, {})
  return (
    <form action={formAction} className="space-y-3">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <label className="microlabel block">
        Product *
        <select name="productId" required defaultValue={defaultProductId || ''} className="field mt-1.5">
          <option value="" disabled>Select product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>
      <label className="microlabel block">
        COA document (PDF) *
        <input type="file" name="file" required accept="application/pdf" className="field mt-1.5" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="microlabel block">
          Testing date
          <input type="date" name="testingDate" className="field mt-1.5" />
        </label>
        <label className="microlabel block">
          Laboratory
          <input name="laboratory" placeholder="Lab name" className="field mt-1.5" />
        </label>
        <label className="microlabel block">
          COA number
          <input name="coaNumber" className="field mt-1.5 font-mono" />
        </label>
        <label className="microlabel block">
          Lot / batch
          <input name="lotNumber" placeholder="e.g. RET-260801" className="field mt-1.5 font-mono" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="makeCurrent" defaultChecked className="h-4 w-4 accent-[#c9a961]" />
        Set as current COA (previous becomes historical)
      </label>
      <SubmitButton className="btn btn-gold btn-sm w-full" pendingLabel="Uploading…">
        Upload COA
      </SubmitButton>
      <p className="text-[0.65rem] leading-relaxed text-muted">
        Enter only information that appears in the document. The storefront displays &ldquo;COA
        available&rdquo; — never verification or purity claims beyond the document itself.
      </p>
    </form>
  )
}
