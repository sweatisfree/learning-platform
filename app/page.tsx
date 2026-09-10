import { Hero } from "@/components/marketing/Hero";
import { Highlights } from "@/components/marketing/Highlights";
import { Bento } from "@/components/marketing/Bento";
import { Integrations } from "@/components/marketing/Integrations";
import { Roadmap } from "@/components/marketing/Roadmap";
import { Pricing } from "@/components/marketing/Pricing";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <Highlights />
      <Bento />
      <Integrations />
      <Roadmap />
      <Pricing />
    </main>
  );
}
