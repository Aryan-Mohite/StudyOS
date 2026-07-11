import { Navbar }   from "@/components/Navbar";
import { Footer }   from "@/components/Footer";
import { Hero }     from "@/components/Hero";
import { Features } from "@/components/Features";
import { CTA }      from "@/components/CTA";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
