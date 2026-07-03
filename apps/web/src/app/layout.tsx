import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "租赁公司提成系统",
  description: "LCS-P1-H01 sales commission settlement MVP"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

