import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SOS-Connext",
  description: "ระบบประสานงานช่วยเหลือฉุกเฉิน", // เพิ่ม description เพื่อความสวยงาม (ถ้าต้องการ)
  icons: {
    icon: "/sos-icon.jpg", // หรือเปลี่ยนเป็นชื่อไฟล์ไอคอนของคุณ เช่น "/logo.png"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
