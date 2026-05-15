import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GokulHub",

  description:
    "Official Gokul Residency Community App",

  manifest: "/manifest.json",

  icons: {
    icon: "/icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">

      <body>
        {children}
      </body>

    </html>
  );
}