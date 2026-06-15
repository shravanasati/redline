import { Footer } from "@/components/footer";
import { CTA } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Stats />
      <CTA />
      <Footer />
    </>
  );
}
