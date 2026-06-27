import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #16a34a 0%, #064e3b 100%)',
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="50" y1="50" x2="20" y2="28" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <line x1="50" y1="50" x2="80" y2="28" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <line x1="50" y1="50" x2="15" y2="65" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <line x1="50" y1="50" x2="85" y2="65" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <line x1="50" y1="50" x2="50" y2="86" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <circle cx="20" cy="28" r="9" fill="#86efac" />
          <circle cx="80" cy="28" r="9" fill="#86efac" />
          <circle cx="15" cy="65" r="9" fill="#86efac" />
          <circle cx="85" cy="65" r="9" fill="#86efac" />
          <circle cx="50" cy="86" r="9" fill="#86efac" />
          <circle cx="50" cy="50" r="16" fill="white" />
          <circle cx="50" cy="50" r="9" fill="#22c55e" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
