import './globals.css'

export const metadata = {
  title: 'H2 Grow Job Tracker',
  description: 'Job tracking dashboard for H2 Grow LLC',
  manifest: '/manifest.json',
  themeColor: '#141414',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
