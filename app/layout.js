import "./globals.css";

export const metadata = {
  title: "Collection CRM",
  description: "Quantilix Collection CRM",
  icons: { icon: "/assets/blinku_logo.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
