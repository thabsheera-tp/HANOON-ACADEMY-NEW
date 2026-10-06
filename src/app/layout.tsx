import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hanoon Academy | Modern Islamic EdTech & Skill Learning",
  description:
    "Empowering learners with authentic Islamic education, academic home tuition, and professional skill mastery at Hanoon Academy.",
  keywords: [
    "Hanoon Academy",
    "Islamic EdTech",
    "Adaviyya Course",
    "Home Tuition",
    "Fashion Designing Course",
    "Islamic Studies",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} font-sans antialiased`}>
      <body className="min-h-screen bg-white text-slate-900 selection:bg-purple-100 selection:text-purple-700">
        {children}
      </body>
    </html>
  );
}
