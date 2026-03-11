import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeRoot } from "@/components/theme/ThemeRoot";
import { AuthProvider } from "@/components/auth/AuthProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ConnectionBanner from "@/components/ConnectionBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3dEZ",
  description: "Design custom 3D-printable objects through guided conversation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // NOTE: dangerouslySetInnerHTML below is safe — the script string is a
  // hard-coded literal with no user-supplied content. It reads localStorage
  // to restore the user's theme preference before first paint, preventing flash.
  return (
    <html lang="en" className="dark">
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}})();",
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ConnectionBanner />
          <ThemeRoot>
            <AuthProvider>{children}</AuthProvider>
          </ThemeRoot>
        </ErrorBoundary>
      </body>
    </html>
  );
}
