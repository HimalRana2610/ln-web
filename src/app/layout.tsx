import type { Metadata, Viewport } from "next";
import { Inter, Kalam } from "next/font/google";

import { ServiceWorkerRegistrar } from "@/components/offline/service-worker-registrar";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

/**
 * The old app pulled these from the Google Fonts CDN in `index.html`.
 * `next/font` self-hosts them at build time instead, removing a render-blocking
 * third-party request and the layout shift that came with it.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LectureNote AI",
    template: "%s · LectureNote AI",
  },
  description: "AI lecture notes, proximity attendance and coursework in one place.",
};

/** The old app's status bar and splash colour (slate-800). */
export const viewport: Viewport = { themeColor: "#1e293b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Before first paint, so a stored dark theme never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${kalam.variable} font-sans antialiased`}>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
