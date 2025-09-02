import { ImageResponse } from 'next/og'
 
// Route segment config
export const runtime = 'edge'
 
// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)', // Primary blue gradient
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          border: '3px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FEF3C7',
          }}
        >
          <div
            style={{
              fontSize: '80px',
              marginBottom: '8px',
            }}
          >
            🐝
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              textAlign: 'center',
            }}
          >
            BUSY<br/>BEES
          </div>
        </div>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported icons size metadata
      // config to also set the ImageResponse's width and height.
      ...size,
    }
  )
}



