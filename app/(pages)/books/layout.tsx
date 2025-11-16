import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Books | Furkan Ünsalan",
  description:
    "A collection of books I've read, am currently reading, or plan to read.",
};

export default function BooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
