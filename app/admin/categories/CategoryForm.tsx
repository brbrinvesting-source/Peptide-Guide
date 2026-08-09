'use client'

import { useActionState } from 'react'
import { saveCategoryAction, type AdminActionState } from '@/app/actions/admin'
import { Alert, SubmitButton } from '@/components/forms'

export function CategoryForm({
  category,
}: {
  category: { id: string; name: string; sortOrder: number; active: boolean } | null
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(saveCategoryAction, {})
  return (
    <form action={formAction} className="space-y-3">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      {category && <input type="hidden" name="id" value={category.id} />}
      <input name="name" required defaultValue={category?.name} placeholder="Category name" aria-label="Category name" className="field" />
      <div className="flex items-center gap-3">
        <input name="sortOrder" inputMode="numeric" defaultValue={category?.sortOrder ?? 0} aria-label="Sort order" className="field w-24" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={category?.active ?? true} className="h-4 w-4 accent-[#c9a961]" /> Active
        </label>
      </div>
      <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Saving…">
        {category ? 'Save' : 'Add Category'}
      </SubmitButton>
    </form>
  )
}
