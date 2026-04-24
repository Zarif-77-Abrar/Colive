import { Inter } from "next/font/google";
import "./globals.css";


import { NotificationProvider } from "../lib/NotificationContext";

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
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}