import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import '../../public/css/font-seatsdesigner.css';
import { ThemeProvider } from 'next-themes';

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Venue Plan Creator",
  description: "Interactive venue seating plan editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className={roboto.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}