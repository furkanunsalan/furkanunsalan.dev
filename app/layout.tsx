import type { Metadata } from "next";
import { Inter } from "next/font/google";
import CommandPalette from "@/components/CommandPalette";
import FaviconAnimator from "@/components/FaviconAnimator";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Furkan Ünsalan",
  description: "Software Developer | Photography Enthusiast | @Istanbul",
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "Furkan Ünsalan",
    "Furkan Unsalan",
    "furkanunsalan dev",
    "furkanunsalan.dev",
  ],
  metadataBase: new URL("https://furkanunsalan.dev"),
  alternates: {
    types: {
      "application/rss+xml": [
        {
          url: "/rss.xml",
          title: "Furkan Ünsalan's Blog RSS Feed",
        },
      ],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} page-enter`}>
        {children}
        <CommandPalette />
        <FaviconAnimator />
      </body>
    </html>
  );
}
