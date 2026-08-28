import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "حولك | اكتشف المكان المناسب لك",
  description: "خريطة ذكية لاكتشاف الوجهات القريبة وفهم تجربة الزوار.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
