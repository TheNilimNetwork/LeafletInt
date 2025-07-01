import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using next/font for Inter
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';


// Configure Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // CSS variable for Inter
});

export const metadata: Metadata = {
  title: 'GeoRoute Navigator',
  description: 'Find the smartest routes with terrain analysis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Leaflet Routing Machine CSS (optional if not using its default UI) */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" 
        />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
