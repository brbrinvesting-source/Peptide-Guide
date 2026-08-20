import 'server-only'
import { getStore } from '@netlify/blobs'
import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

// Private file storage for COA documents. Files live outside public/ and are
// only ever served through authenticated routes.
//
// On Netlify, NETLIFY=true is set automatically in every build and function
// runtime — files go to Netlify Blobs there, which is durable and survives
// deploys with zero extra credentials needed. Outside that context (plain
// `next dev` locally), falls back to the local filesystem so development
// doesn't require `netlify dev` or Blobs credentials.

const STORE_NAME = 'coa-documents'
const useBlobs = process.env.NETLIFY === 'true'
const STORAGE_ROOT = process.env.FILE_STORAGE_DIR || path.join(process.cwd(), 'storage')

function safeKey(key: string): string {
  const resolved = path.resolve(STORAGE_ROOT, key)
  if (!resolved.startsWith(path.resolve(STORAGE_ROOT) + path.sep)) {
    throw new Error('Invalid storage key')
  }
  return resolved
}

export async function storeFile(prefix: string, ext: string, data: Buffer): Promise<string> {
  const key = `${prefix}/${Date.now()}-${randomBytes(8).toString('hex')}${ext}`
  if (useBlobs) {
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    await getStore(STORE_NAME).set(key, arrayBuffer)
    return key
  }
  const filePath = safeKey(key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, data)
  return key
}

export async function readStoredFile(key: string): Promise<Buffer> {
  if (useBlobs) {
    const data = await getStore(STORE_NAME).get(key, { type: 'arrayBuffer' })
    if (!data) throw new Error(`Stored file not found: ${key}`)
    return Buffer.from(data)
  }
  return readFile(safeKey(key))
}

export async function deleteStoredFile(key: string): Promise<void> {
  if (useBlobs) {
    await getStore(STORE_NAME).delete(key).catch(() => {})
    return
  }
  await unlink(safeKey(key)).catch(() => {})
}
