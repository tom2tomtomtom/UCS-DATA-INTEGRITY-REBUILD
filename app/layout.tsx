import "./globals.css";

export const metadata = {
  title: "UCS Commercial Dashboard",
  description: "Source-traceable commercial reconciliation dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
