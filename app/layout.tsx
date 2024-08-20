import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Furkan Ünsalan",
  description: "My portfolio website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Using Script component for Umami */}
        <script
          src="https://cloud.umami.is/script.js"
          data-website-id="227d51b5-5f5f-42aa-a9eb-a38128095d7b"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
