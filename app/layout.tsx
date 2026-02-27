import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STREAKR — AI Running Route Planner",
  description:
    "New city. Same streak. Tell STREAKR where you are and get a mapped running route instantly.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
