import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Iftar '26",
  description: "IIT Iftar '26 Scanner",
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        {children}
      </body>
    </html>
  )
}
