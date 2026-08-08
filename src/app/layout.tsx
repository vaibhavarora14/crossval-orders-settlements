import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Ledgerly — Orders & Settlements",
  description: "CrossVal take-home assignment"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
