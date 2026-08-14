import { ImageResponse } from 'next/og'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

// Satori (used by ImageResponse) does not reliably render inline
// <path>/<circle>/<polyline> children — it builds without error but the
// vector content silently comes out blank. A data-URI <img> is the
// supported way to get real vector art into an icon/OG image. Keep this
// path data in sync with components/Logo.tsx's AAMarkGraphic if the mark
// ever changes — it can't be imported directly here for that reason.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 94">
<path d="M30 82 L54 14 L78 82 Z" fill="#f5f5f4"/>
<path d="M46 82 L70 14 L94 82 Z" fill="#f5f5f4"/>
<polyline points="14,68 34,58 50,64 66,38 82,44 106,20" stroke="#c9a961" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<circle cx="14" cy="68" r="4.2" fill="#c9a961"/>
<circle cx="34" cy="58" r="4.2" fill="#c9a961"/>
<circle cx="50" cy="64" r="4.2" fill="#c9a961"/>
<circle cx="66" cy="38" r="4.2" fill="#c9a961"/>
<circle cx="82" cy="44" r="4.2" fill="#c9a961"/>
<circle cx="106" cy="20" r="4.2" fill="#c9a961"/>
</svg>`

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
        <img
          src={`data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`}
          width={48}
          height={38}
          alt=""
        />
      </div>
    ),
    { ...size }
  )
}
