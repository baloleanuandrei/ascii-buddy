import type { ReactNode } from "react";

export const metadata = {
  title: "asciibuddy — playground",
  description: "Preview branded CLI UI packs in your browser.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#0b0b10", color: "#e2e2e2" }}>
        {children}
      </body>
    </html>
  );
}
