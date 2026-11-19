import { cartProductsData } from "@/data/products/cart-products-data";

export interface SearchProduct {
  id: string;
  title: string;
  category: string;
  unitPriceCents: number;
  currency: "USD";
}

// Local storefront fixtures. Replace with catalog search when the API is connected.
export const searchProductsData: SearchProduct[] = [
  ...cartProductsData.map((product) => ({
    id: product.productId,
    title: product.title,
    category: "Personal Care",
    unitPriceCents: product.unitPriceCents,
    currency: product.currency,
  })),
  {
    id: "medline-bath-bench",
    title: "Medline Bath Bench with Back and Arms",
    category: "Bath & Mobility",
    unitPriceCents: 3358,
    currency: "USD",
  },
  {
    id: "vive-rotating-reacher",
    title: "Vive Rotating Reacher Grabber",
    category: "Daily Living Aids",
    unitPriceCents: 2399,
    currency: "USD",
  },
  {
    id: "omron-bp7150",
    title: "OMRON 3 Series Upper Arm Blood Pressure Monitor BP7150",
    category: "Health Monitors",
    unitPriceCents: 4799,
    currency: "USD",
  },
  {
    id: "renpho-foot-massager",
    title: "RENPHO Shiatsu Foot Massager Premium",
    category: "Massagers & Comfort",
    unitPriceCents: 11999,
    currency: "USD",
  },
];

export function matchesSearchProduct(
  product: SearchProduct,
  query: string,
): boolean {
  const normalize = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const searchable = normalize(
    `${product.title} ${product.category}`,
  );
  return normalize(query)
    .trim()
    .split(/\s+/)
    .every((word) => searchable.includes(word));
}
