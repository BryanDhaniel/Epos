import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Epos — Living History",
  description:
    "Explore historical decisions, relationships, and consequences inside a living simulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
