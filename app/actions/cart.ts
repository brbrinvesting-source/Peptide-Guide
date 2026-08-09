'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import {
  addToCart,
  applyPromoToCart,
  removePromoFromCart,
  setCartItemQuantity,
} from '@/lib/cart'
import { rateLimit } from '@/lib/rate-limit'

export interface CartActionState {
  error?: string
  success?: string
}

function revalidateCartPaths() {
  revalidatePath('/cart')
  revalidatePath('/checkout')
  revalidatePath('/', 'layout') // header cart badge
}

export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const user = await requireUser()
  const productId = String(formData.get('productId') ?? '')
  const quantity = parseInt(String(formData.get('quantity') ?? '1'), 10)
  const result = await addToCart(user.id, productId, quantity)
  if (!result.ok) return { error: result.error }
  revalidateCartPaths()
  return { success: 'Added to cart.' }
}

export async function setQuantityAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const user = await requireUser()
  const productId = String(formData.get('productId') ?? '')
  const quantity = parseInt(String(formData.get('quantity') ?? '0'), 10)
  const result = await setCartItemQuantity(user.id, productId, quantity)
  revalidateCartPaths()
  return result.ok ? {} : { error: result.error }
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  const productId = String(formData.get('productId') ?? '')
  await setCartItemQuantity(user.id, productId, 0)
  revalidateCartPaths()
}

export async function applyPromoAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const user = await requireUser()
  if (!rateLimit(`promo:${user.id}`, 10, 10 * 60 * 1000)) {
    return { error: 'Too many promo attempts. Please wait a few minutes.' }
  }
  const code = String(formData.get('code') ?? '').trim()
  if (!code) return { error: 'Enter a promo code.' }
  const result = await applyPromoToCart(user.id, code)
  if (!result.ok) return { error: result.error }
  revalidateCartPaths()
  return { success: 'Promo code applied.' }
}

export async function removePromoAction(): Promise<void> {
  const user = await requireUser()
  await removePromoFromCart(user.id)
  revalidateCartPaths()
}
