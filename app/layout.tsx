import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "言析 Insight · 用户访谈研究工作台",
  description: "围绕研究问题整理访谈，核对原文证据，形成可追溯的产品洞察。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
