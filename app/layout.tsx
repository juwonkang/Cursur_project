import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "옷 정보 분석기",
  description: "사진 속 옷의 특징을 분석해주는 웹 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
