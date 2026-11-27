import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

function resolveMetadataBase(): URL | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return undefined;
  try {
    return new URL(siteUrl);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "PastCraft — One Community. One World. Countless Connections.",
    template: "%s | PastCraft",
  },
  description:
    "Explore the PastCraft international community through an interactive 3D Earth, shared milestones, community media, and global chapters.",
  openGraph: {
    title: "PastCraft",
    description:
      "One community. One world. Countless connections. Explore PastCraft across continents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-sans antialiased selection:bg-sky-500/30 selection:text-sky-100">
        {children}
      </body>
    </html>
  );
}
