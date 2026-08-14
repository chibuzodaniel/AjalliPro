import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cusica International — Ajalli ERP",
  description: "Ajalli Table Water — Operations ERP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
