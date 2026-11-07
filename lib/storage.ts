import 'server-only'
import { getStore } from '@netlify/blobs'
import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

// Generic file storage, used both for COA documents (private — served only
// through an authenticated route) and for admin-uploaded product images
// (public — served through an unauthenticated route). Callers pass a `store`
// name so the two never collide; see STORES below for the ones in use.
//
// On Netlify, NETLIFY=true is set automatically in every build and function
// runtime — files go to Netlify Blobs there, which is durable and survives
// deploys with zero extra credentials needed. Outside that context (plain
// `next dev` locally), falls back to the local filesystem so development
// doesn't require `netlify dev` or Blobs credentials.

export const STORES = {
  coaDocuments: 'coa-documents',
  productImages: 'product-images',
} as const

const useBlobs = process.env.NETLIFY === 'true'
const STORAGE_ROOT = process.env.FILE_STORAGE_DIR || path.join(process.cwd(), 'storage')

function safeKey(store: string, key: string): string {
  const root = path.resolve(STORAGE_ROOT, store)
  const resolved = path.resolve(root, key)
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error('Invalid storage key')
  }
  return resolved
}

export async function storeFile(store: string, prefix: string, ext: string, data: Buffer): Promise<string> {
  const key = `${prefix}/${Date.now()}-${randomBytes(8).toString('hex')}${ext}`
  if (useBlobs) {
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    await getStore(store).set(key, arrayBuffer)
    return key
  }
  const filePath = safeKey(store, key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, data)
  return key
}

export async function readStoredFile(store: string, key: string): Promise<Buffer> {
  if (useBlobs) {
    const data = await getStore(store).get(key, { type: 'arrayBuffer' })
    if (!data) throw new Error(`Stored file not found: ${key}`)
    return Buffer.from(data)
  }
  return readFile(safeKey(store, key))
}

export async function deleteStoredFile(store: string, key: string): Promise<void> {
  if (useBlobs) {
    await getStore(store).delete(key).catch(() => {})
    return
  }
  await unlink(safeKey(store, key)).catch(() => {})
}
