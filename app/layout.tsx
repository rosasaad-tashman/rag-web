import type { Metadata } from "next";
import { Sora, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const displaySans = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const bodySerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content-Image-RAG · Icon search & generation",
  description:
    "Search the icon library by meaning, and generate new icons matched to its visual style.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displaySans.variable} ${bodySerif.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[#F6F4EE] text-[#1B1B18]">{children}</body>
    </html>
  );
}
