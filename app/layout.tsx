import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Furkan Ünsalan",
  description: "Software Developer | Photography Enthusiast | @Istanbul",
  openGraph: {
    title: "Furkan Ünsalan",
    description: "Software Developer | Photography Enthusiast | @Istanbul",
    images: [
      {
        url: "https://furkanunsalan.dev/opengraph-image.png", // Updated OG image path
        alt: "Furkan Ünsalan", // Optional alt description
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Umami Analytics */}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="227d51b5-5f5f-42aa-a9eb-a38128095d7b"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
