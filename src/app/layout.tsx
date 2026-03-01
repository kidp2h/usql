import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { type Tour, TourProvider } from "@/components/ui/tour"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Universe SQL",
  description: "A SQL client for managing your databases",
};

const tours = [
  {
    id: "main",
    steps: [
      {
        id: "welcome",
        title: "Welcome",
        content: "Let's take a quick tour of the main features.",
      },
      {
        id: "feature-1",
        title: "Feature One",
        content: "This is an important feature.",
      },
    ],
  },
] satisfies Tour[]



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TourProvider tours={tours}>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster />
        </body>
      </html>
    </TourProvider>

  );
}
