import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0f1117",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "DevTrace — Developer Assessment Platform",
  description: "Enterprise Behavioral Telemetry & Technical Evaluation IDE",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
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
