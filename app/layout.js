import "./globals.css";
import { readCompanyConfig } from "@/lib/companyConfig";
import { hexToRgbTriple } from "@/lib/colorUtils";
import { CompanyConfigProvider } from "@/components/company/CompanyConfigProvider";

export async function generateMetadata() {
  const config = readCompanyConfig();
  return {
    title: config.appName,
    description: `${config.appName} — ${config.tagline}`,
    icons: { icon: config.logoUrl || "/assets/blinku_logo.png" },
  };
}

export default async function RootLayout({ children }) {
  const config = readCompanyConfig();

  // Overrides app/globals.css's :root defaults with the Company Setup
  // theme — tailwind.config.js's color tokens resolve these same variable
  // names, so every existing bg-accent/text-accent-dark/bg-navy/etc. class
  // across the app picks this up automatically. Values must be "R G B"
  // triples (not hex) — see the comment in tailwind.config.js.
  const themeCss = `:root{--accent:${hexToRgbTriple(config.accent)};--accent-dark:${hexToRgbTriple(
    config.accentDark
  )};--accent-light:${hexToRgbTriple(config.accentLight)};--navy:${hexToRgbTriple(
    config.navy
  )};--navy-light:${hexToRgbTriple(config.navyLight)};}`;

  return (
    <html lang="en">
      <body>
        <style id="company-theme">{themeCss}</style>
        <CompanyConfigProvider config={config}>{children}</CompanyConfigProvider>
      </body>
    </html>
  );
}
