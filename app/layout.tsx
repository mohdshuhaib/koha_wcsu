import './globals.css'
import Navbar from '../components/Navbar'
import { muller2, muller, anekMal } from "./fonts";
import { ReactNode } from 'react'
import { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: "#2C6B2F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://campuslibrary.vercel.app"),
  title: "Campus Library - Wafy College Kattilangadi",
  description: "Library management system for Wafy Campus Kalikkavu.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Campus Library",
  },
  openGraph: {
    title: "Campus Library - Wafy College Kattilangadi",
    description: "Library management system for Wafy Campus Kalikkavu.",
    url: "https://campuslibrary.vercel.app",
    siteName: "Campus Library",
    images: [
      {
        url: "/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: "Campus Library Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${muller2.variable} ${muller.variable} ${anekMal.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="campuslibrary" />
      </head>
      <body className="font-body bg-primary-grey antialiased overflow-x-hidden">
        <div className="min-h-screen overflow-x-hidden">
          <Navbar />
          <main className="overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}