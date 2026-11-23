export enum ProductCategory {
  PersonalCare = 'personal-care',
  BathMobility = 'bath-mobility',
  DailyLiving = 'daily-living-aids',
  HealthMonitors = 'health-monitors',
  Comfort = 'massagers-comfort',
}
export const categoryLabels: Record<ProductCategory, string> = {
  [ProductCategory.PersonalCare]: 'Personal Care', [ProductCategory.BathMobility]: 'Bath & Mobility',
  [ProductCategory.DailyLiving]: 'Daily Living Aids', [ProductCategory.HealthMonitors]: 'Health Monitors', [ProductCategory.Comfort]: 'Massagers & Comfort',
};
export type ProductMedia = { assetId: string; url: string; alt: string; name: string };
export type ProductDetailImage = Pick<ProductMedia, 'assetId' | 'url' | 'name'>;
export type ProductDetailImageSection = 'usage' | 'care' | 'safety';
export const optionTypes = ['image-swatch', 'color-swatch', 'size', 'length', 'pack-count'] as const;
export type ProductOptionType = typeof optionTypes[number];
export const discountBadgeTypes = ['none', 'percent-off', 'save-amount', 'now-price', 'flat-percent-off'] as const;
export type ProductDiscountBadge = typeof discountBadgeTypes[number];
export const discountBadgeLabels: Record<ProductDiscountBadge, string> = {
  none: 'No badge',
  'percent-off': 'x% OFF',
  'save-amount': 'SAVE $x',
  'now-price': 'NOW $x',
  'flat-percent-off': 'FLAT x% OFF',
};
export const optionTypeLabels: Record<ProductOptionType, string> = {
  'image-swatch': 'Image swatches', 'color-swatch': 'Color swatches', size: 'Size', length: 'Length', 'pack-count': 'Pack count',
};
export type ProductVariant = {
  type: ProductOptionType; title: string; priceMode: 'same' | 'custom'; price: string; colorHex: string;
  image: Pick<ProductMedia, 'assetId' | 'url' | 'name'> | null;
};
export type CatalogProduct = {
  id: string; version?: number; createdAt?: string; updatedAt?: string; name: string; brand: string; category: ProductCategory;
  slug: string; variants: ProductVariant[]; images: ProductMedia[];
  price: string; rating: string; reviewCount: string; soldCount: string; leads: number; details: Record<string, string>;
  featuredProduct: boolean; discountPrice: string; discountBadge: ProductDiscountBadge;
  detailImages: Record<ProductDetailImageSection, ProductDetailImage | null>;
};

export const emptyVariant = (type: ProductOptionType = 'size'): ProductVariant => ({ type, title: '', priceMode: 'same', price: '', colorHex: type === 'color-swatch' ? '#000000' : '', image: null });
