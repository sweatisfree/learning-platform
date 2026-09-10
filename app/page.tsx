import { Hero } from "@/components/marketing/Hero";
import { Pillars } from "@/components/marketing/Pillars";
import { Integrations } from "@/components/marketing/Integrations";
import { Roadmap } from "@/components/marketing/Roadmap";
import { Pricing } from "@/components/marketing/Pricing";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <Pillars />
      <Integrations />
      <Roadmap />
      <Pricing />
    </main>
  );
}
