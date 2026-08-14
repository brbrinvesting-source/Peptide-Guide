import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

// Satori (used by ImageResponse) does not reliably render inline
// <path>/<circle>/<polyline> children — verified separately that it builds
// without error but the vector content comes out blank. A data-URI <img>
// is the supported way to get real image content into an icon/OG image,
// so the actual logo file is read and embedded that way.
const logoBuffer = readFileSync(join(process.cwd(), 'public/brand/aa-logo.png'))
const logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
        }}
      >
        <img src={logoDataUrl} width={58} height={39} alt="" />
      </div>
    ),
    { ...size }
  )
}
