import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "毕业论文双选中心",
  description: "毕业论文师生双向选择与确认系统。",
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
