export interface CartProduct {
  id: string;
  productId: string;
  title: string;
  description: string;
  variant: string;
  image: string | null;
  currency: "USD";
  unitPriceCents: number;
  compareAtPriceCents: number | null;
  quantity: number;
  maxQuantity: number;
}

export const cartProductsData: CartProduct[] = [
  {
    id: "cart-tena-overnight-xl-48",
    productId: "tena-proskin-overnight-protective-underwear",
    title: "TENA ProSkin Overnight Protective Underwear",
    description: "Breathable pull-up underwear for overnight personal care.",
    variant: "X-Large · Case of 48",
    image: null,
    currency: "USD",
    unitPriceCents: 5670,
    compareAtPriceCents: 7088,
    quantity: 1,
    maxQuantity: 10,
  },
  {
    id: "cart-tena-breathable-large-64",
    productId: "tena-proskin-fully-breathable-protective-underwear",
    title: "TENA ProSkin Fully Breathable Protective Underwear",
    description:
      "Breathable protective pull-up underwear with extra absorbency.",
    variant: "Large · Case of 64",
    image: null,
    currency: "USD",
    unitPriceCents: 6300,
    compareAtPriceCents: null,
    quantity: 1,
    maxQuantity: 10,
  },
  {
    id: "cart-tena-overnight-pads-84",
    productId: "tena-sensitive-care-extra-coverage-overnight-pads",
    title: "TENA Sensitive Care Extra Coverage Overnight Pads",
    description: "Extra-coverage incontinence pads for overnight use.",
    variant: "16 inches · Case of 84",
    image: null,
    currency: "USD",
    unitPriceCents: 5999,
    compareAtPriceCents: null,
    quantity: 1,
    maxQuantity: 10,
  },
];
