"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartProduct } from "@/data/products/cart-products-data";
import { calculateCartLine, formatCartMoney } from "@/utils/cart";

interface CartProductCardProps {
  item: CartProduct;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartProductCard({
  item,
  onQuantityChange,
  onRemove,
}: CartProductCardProps) {
  const line = calculateCartLine(item);

  return (
    <article className="rounded-2xl border border-border bg-input p-3 md:p-4">
      <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-3 md:grid-cols-[5rem_minmax(0,1fr)] md:gap-4">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-card">
          {item.image && (
            <Image
              src={item.image}
              alt={item.title}
              fill
              sizes="80px"
              className="object-contain p-2"
            />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-semibold text-heading">
            {item.title}
          </h3>
          <p className="mt-1 text-sm text-sub-heading">{item.variant}</p>
          <p className="mt-1 text-sm font-semibold text-heading tabular-nums">
            {formatCartMoney(item.unitPriceCents, item.currency)}{" "}
            <span className="font-normal text-sub-heading">each</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div
            className="inline-flex items-center rounded-full border border-border bg-background"
            role="group"
            aria-label={`Quantity for ${item.title}`}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={item.quantity <= 1}
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
              aria-label={`Decrease quantity of ${item.title}`}
              className="size-11 rounded-full"
            >
              <Minus className="size-4" aria-hidden="true" />
            </Button>
            <span
              className="min-w-6 text-center text-base font-semibold tabular-nums"
              aria-label={`Quantity ${item.quantity}`}
            >
              {item.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={item.quantity >= item.maxQuantity}
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              aria-label={`Increase quantity of ${item.title}`}
              className="size-11 rounded-full"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.title} from cart`}
            title="Remove item"
            className="size-11 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="ml-auto text-right">
          {line.savingsCents > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="sr-only">Original line price </span>
              <s>{formatCartMoney(line.originalCents, item.currency)}</s>
            </p>
          )}
          <p className="text-xl font-bold text-heading tabular-nums">
            <span className="sr-only">Line total </span>
            {formatCartMoney(line.subtotalCents, item.currency)}
          </p>
        </div>
      </div>
    </article>
  );
}
