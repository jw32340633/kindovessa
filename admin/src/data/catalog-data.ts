export const catalogPageSizes = { categories: 5, products: 10 } as const;

export type CatalogCategory = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  coverAssetId: string;
  productCount: number;
  createdAt: string;
  version: number;
};

export function catalogCategorySlug(title: string) {
  return title
    .trim()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function catalogCategoryTitle(
  slug: string,
  categories: readonly { slug: string; title: string }[],
) {
  return categories.find((category) => category.slug === slug)?.title ?? slug;
}
export type ProductMedia = {
  assetId: string;
  url: string;
  alt: string;
  name: string;
};
export type ProductDetailImage = Pick<ProductMedia, "assetId" | "url" | "name">;
export type ProductDetailImageSection = "usage" | "care" | "safety";
export const optionTypes = [
  "image-swatch",
  "color-swatch",
  "size",
  "length",
  "pack-count",
] as const;
export type ProductOptionType = (typeof optionTypes)[number];
export const discountBadgeTypes = [
  "none",
  "percent-off",
  "save-amount",
  "now-price",
  "flat-percent-off",
] as const;
export type ProductDiscountBadge = (typeof discountBadgeTypes)[number];
export const discountBadgeLabels: Record<ProductDiscountBadge, string> = {
  none: "No badge",
  "percent-off": "x% OFF",
  "save-amount": "SAVE $x",
  "now-price": "NOW $x",
  "flat-percent-off": "FLAT x% OFF",
};
export const optionTypeLabels: Record<ProductOptionType, string> = {
  "image-swatch": "Image swatches",
  "color-swatch": "Color swatches",
  size: "Size",
  length: "Length",
  "pack-count": "Pack count",
};
export type ProductVariant = {
  type: ProductOptionType;
  title: string;
  priceMode: "same" | "custom";
  price: string;
  colorHex: string;
  image: Pick<ProductMedia, "assetId" | "url" | "name"> | null;
};
export type CatalogProduct = {
  id: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  name: string;
  brand: string;
  category: string;
  slug: string;
  variants: ProductVariant[];
  images: ProductMedia[];
  price: string;
  rating: string;
  reviewCount: string;
  soldCount: string;
  leads: number;
  details: Record<string, string>;
  featuredProduct: boolean;
  discountPrice: string;
  discountBadge: ProductDiscountBadge;
  detailImages: Record<ProductDetailImageSection, ProductDetailImage | null>;
};

export const emptyVariant = (
  type: ProductOptionType = "size",
): ProductVariant => ({
  type,
  title: "",
  priceMode: "same",
  price: "",
  colorHex: type === "color-swatch" ? "#000000" : "",
  image: null,
});
