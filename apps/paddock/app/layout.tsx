import type { Metadata } from "next";
import { Fira_Code, Lora, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";

const fontSans = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: "400",
});

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "redline | Distributed Uptime Monitoring",
  description:
    "Monitor your services from nodes across the globe every 30 seconds. Get instant alerts before your users notice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light">
          <Navbar />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
