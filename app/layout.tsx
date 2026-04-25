import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
      <head>
        {/* Umami Analytics */}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="227d51b5-5f5f-42aa-a9eb-a38128095d7b"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
