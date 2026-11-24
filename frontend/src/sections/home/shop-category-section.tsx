import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Category, categoryTitles } from "@/data/enum";
import personalCareCategory from "../../../public/images/category-personal-care-img.png";
import bathMobilityCategory from "../../../public/images/category-bath-mobility-img.png";
import dailyLivingCategory from "../../../public/images/category-daily-living-aids-img.png";
import healthMonitorsCategory from "../../../public/images/category-health-monitors-img.png";
import massagersComfortCategory from "../../../public/images/category-massagers-comfort-img.png";

const categories = Object.values(Category);
const categoryImages = {
  [Category.PersonalCare]: personalCareCategory,
  [Category.BathMobility]: bathMobilityCategory,
  [Category.DailyLivingAids]: dailyLivingCategory,
  [Category.HealthMonitors]: healthMonitorsCategory,
  [Category.MassagersComfort]: massagersComfortCategory,
};

export default function ShopCategorySection() {
  return (
    <section aria-labelledby="shop-category-heading" className="section bg-background">
      <div className="page-layout">
        <h2
          id="shop-category-heading"
          className="text-center font-heading text-[clamp(2rem,3.5vw,3rem)] font-medium leading-tight tracking-tight text-heading"
        >
          Shop by Category
        </h2>

        <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6 md:mt-9 md:flex md:flex-wrap md:justify-center md:gap-x-6 md:gap-y-8 lg:mt-10">
          {categories.map((category, index) => (
            <li
              key={category}
              className="min-w-0 last:odd:max-md:col-span-2 md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-6rem)/5)]"
            >
              <Link
                href={`/collections/${category}`}
                className={cn(
                  "group flex h-full flex-col rounded-2xl text-heading outline-offset-4 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background",
                  categories.length % 2 === 1 && index === categories.length - 1 &&
                    "max-md:grid max-md:grid-cols-2 max-md:gap-4 max-md:overflow-hidden max-md:bg-card max-md:hover:bg-muted",
                )}
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-card transition-colors duration-200 group-hover:bg-muted motion-reduce:transition-none">
                  <Image
                    src={categoryImages[category]}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
                    className="object-contain object-center p-3 drop-shadow-[0_8px_6px_rgba(0,0,0,0.16)] transition-transform duration-300 group-hover:scale-[1.03] md:p-4 motion-reduce:transform-none motion-reduce:transition-none"
                  />
                </div>
                <span className={cn(
                  "flex min-h-12 items-center justify-center px-1 pt-2 text-center text-base font-semibold leading-snug md:min-h-16 md:pt-4 md:text-lg",
                  categories.length % 2 === 1 && index === categories.length - 1 &&
                    "max-md:px-3 max-md:pt-0",
                )}>
                  {categoryTitles[category]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
