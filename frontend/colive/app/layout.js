import { Inter } from "next/font/google";
import "./globals.css";
import FCMProvider from "../components/FCMProvider";

const inter = Inter({
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700"],
});

export const metadata = {
  title:       "CoLive",
  description: "Student housing and roommate coordination platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <FCMProvider />
        {children}
      </body>
    </html>
  );
}
