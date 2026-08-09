import 'server-only'
import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

// Private file storage for COA documents. Files live OUTSIDE public/ and are
// only served through authenticated routes. The interface is S3-compatible in
// shape so a cloud backend can replace it without changing call sites
// (set FILE_STORAGE_DIR to a persistent volume in production).

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
  const filePath = safeKey(key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, data)
  return key
}

export async function readStoredFile(key: string): Promise<Buffer> {
  return readFile(safeKey(key))
}

export async function deleteStoredFile(key: string): Promise<void> {
  await unlink(safeKey(key)).catch(() => {})
}
