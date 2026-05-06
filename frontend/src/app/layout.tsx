import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";

import { StaffAuthProvider } from "@/components/auth/staff-auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIU Admin — Luxury Concierge",
  description: "Luxury hotel operations dashboard",
  icons: {
    icon: [{ url: "/siulogo.png", type: "image/png" }],
    apple: [{ url: "/siulogo.png", type: "image/png" }],
    shortcut: "/siulogo.png",
  },
};

const themeInitScript = `
(function(){
  try {
    var k=${JSON.stringify(THEME_STORAGE_KEY)};
    var t=localStorage.getItem(k);
    if(t==='light'){document.documentElement.classList.remove('dark');}
    else{document.documentElement.classList.add('dark');}
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-body text-foreground" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeProvider>
          <StaffAuthProvider>{children}</StaffAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
