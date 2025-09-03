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
      // ImageResponse JSX element with white background and yellow accents
      <div
        style={{
          background: '#ffffff', // White background as requested
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
          border: '3px solid #f5d565', // Yellow border using brand color
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f5d565', // Yellow brand color
          }}
        >
          <div
            style={{
              fontSize: '70px',
              marginBottom: '8px',
            }}
          >
            🍯
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              textAlign: 'center',
              color: '#2d2d2d', // Charcoal color for text
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



