import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FlowForge Admin",
  description: "Operational dashboard for FlowForge jobs and workers",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
