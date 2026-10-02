import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevTrace — Headless Interviewer",
  description: "Behavioral telemetry IDE for engineering assessments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full antialiased overflow-x-hidden selection:bg-blue-500/20">
        {children}
      </body>
    </html>
  );
}
