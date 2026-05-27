import Hero from "@/sections/Hero";
import UploadPreview from "@/sections/UploadPreview";
import ExplainDemo from "@/sections/ExplainDemo";
import Timeline from "@/sections/Timeline";
import Navbar from "@/sections/Navbar";
import Intro from "@/sections/Intro";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-black text-white">
      
      {/* Global ambient background */}
      <div className="pointer-events-none absolute inset-0">
        
        <div className="absolute top-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
        
        <div className="absolute top-[35%] left-[10%] h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[120px]" />
        
        <div className="absolute bottom-0 right-[10%] h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[140px]" />
      </div>

      <section id="intro">
        <Intro />
      </section>

      <Navbar />

      <div className="relative z-10 pt-20 sm:pt-24">
        <section id="about">
          <Hero />
        </section>

        <section id="features">
          <UploadPreview />
        </section>

        <section id="demo">
          <ExplainDemo />
        </section>

        <section id="timeline">
          <Timeline />
        </section>

      </div>
    </main>
  );
}