import type { ImageProps } from "next/image";

export interface BestSellingProducts {
  id: string;
  slug: string;
  name: string;
  category: {
    name: string;
    slug: string;
  };
  image: ImageProps["src"] | null;
  description: string;
  discountPercent: number;
  rating: {
    average: number;
    count: number;
    scale: 5;
  };
}

export const BestSellingProductsData: BestSellingProducts[] = [
  {
    id: "tena-proskin-overnight-protective-underwear",
    slug: "tena-proskin-overnight-protective-underwear",
    name: "TENA ProSkin Overnight Super Breathable Underwear, Heavy Absorbency, 14 ct | Disposable, Incontinence, Large",
    category: {
      name: "Personal Care",
      slug: "personal-care",
    },
    image: null,
    description:
      "Breathable pull-up underwear designed for overnight incontinence care.",
    discountPercent: 20,
    rating: {
      average: 4.6,
      count: 1739,
      scale: 5,
    },
  },
  {
    id: "medline-bath-bench-with-back-and-arms",
    slug: "medline-bath-bench-with-back-and-arms",
    name: "Medline Bath Bench with Back and Arms",
    category: {
      name: "Bath & Mobility",
      slug: "bath-mobility",
    },
    image: null,
    description:
      "Height-adjustable bath bench with a backrest, arms and nonslip feet.",

    discountPercent: 20,
    rating: {
      average: 4.8,
      count: 153,
      scale: 5,
    },
  },
  {
    id: "vive-rotating-reacher-grabber",
    slug: "vive-rotating-reacher-grabber",
    name: "Vive Rotating Reacher Grabber",
    category: {
      name: "Daily Living Aids",
      slug: "daily-living-aids",
    },
    image: null,
    description:
      "Lightweight reaching tool with a rotating jaw and trigger grip.",

    discountPercent: 20,
    rating: {
      average: 4.7,
      count: 212,
      scale: 5,
    },
  },
  {
    id: "omron-3-series-upper-arm-blood-pressure-monitor-bp7150",
    slug: "omron-3-series-upper-arm-blood-pressure-monitor-bp7150",
    name: "OMRON 3 Series Upper Arm Blood Pressure Monitor BP7150",
    category: {
      name: "Health Monitors",
      slug: "health-monitors",
    },
    image: null,
    description:
      "Bluetooth upper-arm monitor with one-touch operation and reading storage.",

    discountPercent: 20,
    rating: {
      average: 4.7,
      count: 128,
      scale: 5,
    },
  },
  {
    id: "renpho-shiatsu-foot-massager-premium",
    slug: "renpho-shiatsu-foot-massager-premium",
    name: "RENPHO Shiatsu Foot Massager Premium",
    category: {
      name: "Massagers & Comfort",
      slug: "massagers-comfort",
    },
    image: null,
    description:
      "Foot massager with kneading massage, heat and remote control.",

    discountPercent: 20,
    rating: {
      average: 4.6,
      count: 4037,
      scale: 5,
    },
  },
];
