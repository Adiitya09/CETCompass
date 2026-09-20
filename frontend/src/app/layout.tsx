import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastContainer } from "@/components/Toast";
import { CompareTray } from "@/components/CompareTray";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CETCompass — Navigate Your Engineering Future",
  description: "CETCompass helps MHT-CET students discover and compare Maharashtra engineering colleges using percentile, branch, seat type, and historical cutoff data.",
  keywords: [
    "CETCompass",
    "MHT-CET College Recommendations",
    "Maharashtra Engineering Colleges",
    "MHT-CET Cutoff Insights",
    "Engineering Cutoffs Maharashtra",
    "COEP",
    "VJTI",
    "PICT",
    "CAP Round Cutoffs",
    "Safe Moderate Reach"
  ],
  openGraph: {
    title: "CETCompass — Navigate Your Engineering Future",
    description: "CETCompass helps MHT-CET students discover and compare Maharashtra engineering colleges using percentile, branch, seat type, and historical cutoff data.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <CompareTray />
        <ToastContainer />
        <Footer />
      </body>
    </html>
  );
}
