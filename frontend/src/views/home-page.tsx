import { Suspense } from "react";
import HeroSection from "@/sections/home/hero-section";
import ShopCategorySection from "@/sections/home/shop-category-section";

function HomePage() {
  return (
    <main>
      <HeroSection />
      <Suspense fallback={null}>
        <ShopCategorySection />
      </Suspense>
    </main>
  );
}

export default HomePage;
