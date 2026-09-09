import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "حولك | اكتشف المكان المناسب لك",
  description: "وش ودك اليوم؟ اختر نوع طلعتك واستكشف أماكن الرياض على الخريطة ببيانات مفتوحة، وشارك تجربتك مع حولك.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
