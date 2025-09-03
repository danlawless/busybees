import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const alt = 'Busy Bees Indoor Play Center'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'
 
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fef7d3 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Honey pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(245, 213, 101, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(245, 213, 101, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(255, 249, 230, 0.3) 0%, transparent 50%)
            `,
          }}
        />
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          {/* Large Hive/Honey Emoji */}
          <div
            style={{
              fontSize: '200px',
              marginBottom: '20px',
            }}
          >
            🍯
          </div>
          
          {/* Brand Text */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#f5d565',
              textAlign: 'center',
              letterSpacing: '2px',
              textShadow: '2px 2px 4px rgba(45, 45, 45, 0.3)',
              marginBottom: '16px',
            }}
          >
            BUSY BEES
          </div>
          
          <div
            style={{
              fontSize: '32px',
              color: '#2d2d2d',
              textAlign: 'center',
              letterSpacing: '1px',
              fontWeight: '600',
            }}
          >
            INDOOR PLAY CENTER
          </div>
          
          <div
            style={{
              fontSize: '24px',
              color: '#666666',
              textAlign: 'center',
              marginTop: '20px',
            }}
          >
            Safe, fun indoor play space for children ages 0-6
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
