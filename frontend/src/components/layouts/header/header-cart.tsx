"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import CartProductCard from "@/components/shared/cart-product-card";

import { cartProductsData } from "@/data/products/cart-products-data";

import {
  calculateCartTotals,
  clampCartQuantity,
  formatCartMoney,
} from "@/utils/cart";

import { ArrowRight, ShoppingBag, X } from "lucide-react";

const mobileQuery = "(max-width: 767px)";
function subscribeToScreen(onChange: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getMobile = () => window.matchMedia(mobileQuery).matches;
const getServerMobile = () => false;

export default function HeaderCart() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() =>
    cartProductsData.map((item) => ({ ...item })),
  );
  const isMobile = useSyncExternalStore(
    subscribeToScreen,
    getMobile,
    getServerMobile,
  );
  const totals = calculateCartTotals(items);
  const updateQuantity = (id: string, quantity: number) =>
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: clampCartQuantity(quantity, item.maxQuantity) }
          : item,
      ),
    );
  const removeItem = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerTrigger
        render={
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 text-heading transition-colors hover:bg-muted md:px-3"
          />
        }
        aria-label={`Open shopping cart, ${totals.quantity} ${totals.quantity === 1 ? "item" : "items"}`}
      >
        <span className="relative">
          <ShoppingBag size={23} strokeWidth={1.5} aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute -top-2 -right-2 flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums"
          >
            {totals.quantity > 99 ? "99+" : totals.quantity}
          </span>
        </span>
        <span className="hidden text-base font-medium lg:inline">Cart</span>
      </DrawerTrigger>
      <DrawerContent
        data-cart-drawer
        aria-describedby={undefined}
        className="border-border bg-background [--drawer-inset:0px] data-[swipe-axis=x]:w-[min(30rem,calc(100vw-1rem))] data-[swipe-axis=x]:rounded-3xl data-[swipe-axis=x]:[--drawer-inset:0.5rem] data-[swipe-axis=y]:h-[min(94dvh,54rem)] data-[swipe-axis=y]:max-h-[95dvh] data-[swipe-axis=y]:rounded-t-3xl motion-reduce:transition-none"
      >
        <DrawerHeader className="border-b border-border px-5 py-3 text-left! md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <DrawerTitle className="text-2xl font-semibold text-heading">
              Your cart{" "}
              <span className="text-lg font-normal text-muted-foreground">
                ({totals.quantity})
              </span>
            </DrawerTitle>
            <DrawerClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label="Close shopping cart"
                />
              }
            >
              <X className="size-5" aria-hidden="true" />
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 md:px-6">
          {items.length ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <CartProductCard
                    item={item}
                    onQuantityChange={updateQuantity}
                    onRemove={removeItem}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center px-2 py-8 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-card">
                <ShoppingBag
                  size={28}
                  strokeWidth={2}
                  className="text-primary"
                  aria-hidden="true"
                />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-heading">
                Your cart is empty
              </h3>
              <p className="mt-2 max-w-64 text-base leading-relaxed text-muted-foreground">
                Explore everyday essentials and find something that fits your
                routine.
              </p>
            </div>
          )}
        </div>
        <DrawerFooter className="gap-2 border-t border-border bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
          {items.length > 0 ? (
            <>
              <div aria-live="polite" aria-atomic="true">
                <dl className="space-y-1.5 text-sm">
                  {totals.savingsCents > 0 && (
                    <div className="flex items-center justify-between gap-3 text-base font-semibold text-accent">
                      <dt>You save</dt>
                      <dd className="tabular-nums">
                        {formatCartMoney(totals.savingsCents)}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 text-xl font-bold text-heading">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">
                      {formatCartMoney(totals.subtotalCents)}
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs leading-relaxed text-sub-heading">
                Shipping and taxes are calculated at checkout.
              </p>
              <Button
                type="button"
                aria-disabled="true"
                aria-label="Checkout (not connected in this preview)"
                className="min-h-12 w-full justify-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                Checkout <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <DrawerClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full rounded-full text-sm font-medium text-sub-heading underline underline-offset-4 hover:bg-muted hover:text-heading"
                  />
                }
              >
                Continue shopping
              </DrawerClose>
            </>
          ) : (
            <DrawerClose
              render={
                <Button
                  type="button"
                  className="min-h-12 w-full rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary-hover"
                />
              }
            >
              Continue shopping
            </DrawerClose>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
