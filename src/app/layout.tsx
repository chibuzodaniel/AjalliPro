import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cusica International — Ajalli ERP",
  description: "Ajalli Table Water — Operations ERP",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ajalli ERP",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  other: {
    // Older iOS (pre-17.4) only recognizes the vendor-prefixed tag; Next's
    // appleWebApp.capable only emits the newer unprefixed mobile-web-app-capable.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E0B1A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
