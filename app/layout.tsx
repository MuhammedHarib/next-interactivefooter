import "./globals.css";
import InteractiveFooter from "@/components/InteractiveFooter/InteractiveFooter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}

        <InteractiveFooter />
      </body>
    </html>
  );
}