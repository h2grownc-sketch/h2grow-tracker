import './globals.css'

export const metadata = {
  title: 'H2 Grow Job Tracker',
  description: 'Job tracking dashboard for H2 Grow LLC',
  manifest: '/manifest.json',
}

// Next 14 wants these in a viewport export. Pinch-zoom is intentionally
// allowed now (WCAG) — maximum-scale/user-scalable=no blocked low-vision users.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#141414',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  )
}
