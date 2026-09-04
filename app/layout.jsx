import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "QuickCart - E-commerce",
  description: "Your one-stop shop for all your needs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          try {
            var savedLocale = localStorage.getItem('locale');
            if (savedLocale === 'ar') {
              document.documentElement.dir = 'rtl';
              document.documentElement.lang = 'ar';
            } else if (savedLocale === 'fr') {
              document.documentElement.lang = 'fr';
            }
          } catch(e) {}
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="bottom-right" />
        <LanguageProvider>
          <AppContextProvider>
            {children}
          </AppContextProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
