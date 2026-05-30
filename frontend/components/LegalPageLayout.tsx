import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-primary text-primary">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16 pt-24 sm:pt-28">
        {children}
      </main>
      <Footer />
    </div>
  );
}
