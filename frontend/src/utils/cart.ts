import type { CartProduct } from "@/data/products/cart-products-data";

export function formatCartMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function calculateCartLine(item: CartProduct) {
  const subtotalCents = item.unitPriceCents * item.quantity;
  const originalCents = Math.max(item.compareAtPriceCents ?? item.unitPriceCents, item.unitPriceCents) * item.quantity;
  return { subtotalCents, originalCents, savingsCents: originalCents - subtotalCents };
}

export function calculateCartTotals(items: readonly CartProduct[]) {
  return items.reduce((totals, item) => {
    const line = calculateCartLine(item);
    return {
      quantity: totals.quantity + item.quantity,
      subtotalCents: totals.subtotalCents + line.subtotalCents,
      originalCents: totals.originalCents + line.originalCents,
      savingsCents: totals.savingsCents + line.savingsCents,
    };
  }, { quantity: 0, subtotalCents: 0, originalCents: 0, savingsCents: 0 });
}

export function clampCartQuantity(quantity: number, maxQuantity: number) {
  return Math.min(maxQuantity, Math.max(1, Number.isFinite(quantity) ? Math.trunc(quantity) : 1));
}
