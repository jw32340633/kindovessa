"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  categoryLabels,
  ProductCategory,
  emptyVariant,
  optionTypeLabels,
  optionTypes,
  type CatalogProduct,
  type ProductDetailImageSection,
  type ProductMedia,
  type ProductOptionType,
} from "@/data/products-data";

const detailFields = [
  ["shortDescription", "Short description"],
  ["description", "Full description"],
  ["highlights", "Highlights (one per line)"],
  ["usage", "Usage instructions"],
  ["care", "Care instructions"],
  ["safety", "Warnings and safety information"],
  ["seoTitle", "SEO title"],
  ["seoDescription", "SEO description"],
] as const;
const selectClass =
  "h-12 w-full min-w-0 rounded-none border bg-card px-3 text-base md:text-sm";
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const detailImageSections = ["usage", "care", "safety"] as const;
const detailLimits: Partial<Record<(typeof detailFields)[number][0], number>> =
  {
    seoTitle: 70,
    seoDescription: 160,
  };
const validImage = (file: File) =>
  imageTypes.includes(file.type) && file.size <= 3 * 1024 * 1024;

export default function ProductEditor({
  product,
  onClose,
  onSave,
}: {
  product: CatalogProduct | null;
  onClose: () => void;
  onSave: (product: CatalogProduct) => Promise<void>;
}) {
  const [category, setCategory] = useState(
    product?.category ?? ProductCategory.PersonalCare,
  );
  const [images, setImages] = useState<ProductMedia[]>(product?.images ?? []);
  const [variantsEnabled, setVariantsEnabled] = useState(
    (product?.variants.length ?? 0) > 0,
  );
  const [optionType, setOptionType] = useState<ProductOptionType>(
    product?.variants[0]?.type ?? "size",
  );
  const [variants, setVariants] = useState(
    product?.variants.map((variant) => ({ ...variant })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [detailImages, setDetailImages] = useState<
    Record<
      ProductDetailImageSection,
      Pick<ProductMedia, "assetId" | "url" | "name"> | null
    >
  >(product?.detailImages ?? { usage: null, care: null, safety: null });
  const [detailImageEnabled, setDetailImageEnabled] = useState<
    Record<ProductDetailImageSection, boolean>
  >({
    usage: Boolean(product?.detailImages?.usage),
    care: Boolean(product?.detailImages?.care),
    safety: Boolean(product?.detailImages?.safety),
  });

  async function uploadFile(file: File) {
    if (!validImage(file))
      throw new Error("Choose a JPEG, PNG, WebP, or AVIF image up to 3 MB.");
    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error?.message ?? "Unable to upload image.");
    return { ...data.image, name: file.name.slice(0, 250) } as ProductMedia;
  }

  async function uploadGallery(files: FileList | null) {
    if (!files || uploading) return;
    const selected = Array.from(files);
    if (images.length + selected.length > 8) {
      toast.error("A product can have up to eight images.");
      return;
    }
    if (selected.some((file) => !validImage(file))) {
      toast.error("Choose JPEG, PNG, WebP, or AVIF images up to 3 MB each.");
      return;
    }
    setUploading(true);
    try {
      for (const [index, file] of selected.entries()) {
        setUploadStatus(`Uploading image ${index + 1} of ${selected.length}`);
        const image = await uploadFile(file);
        setImages((current) => [
          ...current,
          {
            ...image,
            alt:
              file.name
                .replace(/\.[^.]+$/, "")
                .replace(/[-_]+/g, " ")
                .trim()
                .slice(0, 250) || "Product image",
          },
        ]);
      }
      toast.success("Images uploaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload images.",
      );
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  async function uploadSwatch(index: number, file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setUploadStatus("Uploading swatch image");
    try {
      const image = await uploadFile(file);
      setVariants((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                image: {
                  assetId: image.assetId,
                  url: image.url,
                  name: image.name,
                },
              }
            : item,
        ),
      );
      toast.success("Swatch image uploaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload image.",
      );
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  async function uploadDetailImage(
    section: ProductDetailImageSection,
    file: File | undefined,
  ) {
    if (!file || uploading) return;
    setUploading(true);
    setUploadStatus(`Uploading ${section} image`);
    try {
      const image = await uploadFile(file);
      setDetailImages((current) => ({
        ...current,
        [section]: {
          assetId: image.assetId,
          url: image.url,
          name: image.name,
        },
      }));
      toast.success("Instruction image uploaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload image.",
      );
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  function setVariantsActive(checked: boolean) {
    setVariantsEnabled(checked);
    setVariants((current) =>
      checked ? (current.length ? current : [emptyVariant(optionType)]) : [],
    );
  }
  function changeType(type: ProductOptionType) {
    setOptionType(type);
    setVariants((current) =>
      current.map((item) => ({
        ...item,
        type,
        colorHex: type === "color-swatch" ? item.colorHex || "#000000" : "",
        image: type === "image-swatch" ? item.image : null,
      })),
    );
  }
  function updateVariant(
    index: number,
    changes: Partial<(typeof variants)[number]>,
  ) {
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }
  function reorderImages(draggedId: string, targetId: string) {
    setImages((current) => {
      const from = current.findIndex((image) => image.assetId === draggedId);
      const to = current.findIndex((image) => image.assetId === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [image] = next.splice(from, 1);
      next.splice(to, 0, image);
      return next;
    });
  }
  function input(
    name: string,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      value?: string;
      maxLength?: number;
      validate?: (value: string) => string | null;
    } = {},
  ) {
    const initialValue = String(options.value ?? product?.details[name] ?? "");
    const maxLength = options.maxLength ?? 500;
    const currentValue = fieldValues[name] ?? initialValue;
    const validationError = options.validate?.(currentValue) ?? null;
    return (
      <div className="min-w-0 space-y-2">
        <Label htmlFor={`product-${name}`}>{label}</Label>
        <Input
          id={`product-${name}`}
          name={name}
          type={options.type ?? "text"}
          required={options.required}
          defaultValue={initialValue}
          maxLength={maxLength}
          onInput={(event) =>
            setFieldValues((current) => ({
              ...current,
              [name]: event.currentTarget.value,
            }))
          }
          aria-invalid={Boolean(validationError)}
          className={`h-12 rounded-none text-base md:text-sm ${validationError ? "border-destructive" : ""}`}
        />
        <p
          className={`text-xs ${validationError || currentValue.length >= maxLength ? "text-destructive" : "text-muted-foreground"}`}
        >
          {validationError ?? `${currentValue.length}/${maxLength} characters`}
        </p>
      </div>
    );
  }

  function numberField({
    name,
    label,
    value,
    max,
    step = "1",
  }: {
    name: "price" | "rating" | "reviewCount" | "soldCount";
    label: string;
    value?: string;
    max: number;
    step?: string;
  }) {
    const initialValue = value ?? "";
    const currentValue = fieldValues[name] ?? initialValue;
    const numberValue = Number(currentValue);
    const hasValidFormat =
      name === "price"
        ? /^\d{1,7}(?:\.\d{1,2})?$/.test(currentValue)
        : name === "rating"
          ? /^(?:[0-4](?:\.\d)?|5(?:\.0)?)$/.test(currentValue)
          : /^\d+$/.test(currentValue);
    const invalid =
      currentValue !== "" &&
      (!Number.isFinite(numberValue) ||
        numberValue < 0 ||
        numberValue > max ||
        !hasValidFormat);
    const hint =
      name === "price"
        ? "Up to 7 digits and 2 decimal places."
        : name === "rating"
          ? "Use 0–5, with one decimal place."
          : `Maximum ${max.toLocaleString("en-US")}.`;
    return (
      <div className="space-y-2">
        <Label htmlFor={`product-${name}`}>{label}</Label>
        <Input
          id={`product-${name}`}
          name={name}
          type="number"
          min="0"
          max={max}
          step={step}
          defaultValue={initialValue}
          aria-invalid={invalid}
          onInput={(event) =>
            setFieldValues((current) => ({
              ...current,
              [name]: event.currentTarget.value,
            }))
          }
          className={invalid ? "border-destructive" : ""}
        />
        <p className={`text-xs ${invalid ? "text-destructive" : "text-muted-foreground"}`}>
          {invalid ? `Enter a valid value. ${hint}` : hint}
        </p>
      </div>
    );
  }

  function detailField(field: (typeof detailFields)[number][0], label: string) {
    const usesTextarea =
      field.includes("Description") ||
      ["description", "highlights", "usage", "care", "safety"].includes(field);
    if (!usesTextarea) {
      return (
        <div key={field}>
          {input(field, label, { maxLength: detailLimits[field] ?? 500 })}
        </div>
      );
    }
    const maxLength = detailLimits[field] ?? 10000;
    const fieldKey = `details.${field}`;
    const initialValue = product?.details[field] ?? "";
    const currentValue = fieldValues[fieldKey] ?? initialValue;
    const section = detailImageSections.includes(
      field as ProductDetailImageSection,
    )
      ? (field as ProductDetailImageSection)
      : null;
    const enabled = section ? detailImageEnabled[section] : false;
    const image = section ? detailImages[section] : null;
    return (
      <div key={field} className="space-y-2">
        <div className="flex min-h-5 items-center justify-between gap-3">
          <Label htmlFor={`product-${field}`}>{label}</Label>
          {section && (
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`Add an image for ${label.toLowerCase()}`}
              onClick={() => {
                setDetailImageEnabled((current) => ({
                  ...current,
                  [section]: !current[section],
                }));
                if (enabled) {
                  setDetailImages((current) => ({
                    ...current,
                    [section]: null,
                  }));
                }
              }}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? "bg-black" : "bg-muted-foreground/30"}`}
            >
              <span
                className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`}
              />
            </button>
          )}
        </div>
        <Textarea
          id={`product-${field}`}
          name={field}
          defaultValue={initialValue}
          maxLength={maxLength}
          onInput={(event) =>
            setFieldValues((current) => ({
              ...current,
              [fieldKey]: event.currentTarget.value,
            }))
          }
          className="min-h-24"
        />
        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-xs ${currentValue.length >= maxLength ? "text-destructive" : "text-muted-foreground"}`}
          >
            {currentValue.length}/{maxLength} characters
          </p>
          {section && enabled && (
            <div className="flex items-center gap-2">
              {image ? (
                <div className="relative size-10 overflow-hidden border">
                  <Image
                    src={image.url}
                    alt={`${label} image`}
                    fill
                    unoptimized
                    sizes="40px"
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label={`Remove ${label.toLowerCase()} image`}
                    className="absolute right-0 top-0 size-5 rounded-none"
                    onClick={() =>
                      setDetailImages((current) => ({
                        ...current,
                        [section]: null,
                      }))
                    }
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id={`product-${section}-image`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    onChange={(event) => {
                      void uploadDetailImage(section, event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <Label
                    htmlFor={`product-${section}-image`}
                    style={{
                      boxShadow:
                        "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                    }}
                    className="inline-flex h-9 cursor-pointer items-center bg-black px-3 text-xs font-semibold text-white hover:bg-black/85"
                  >
                    Upload image
                  </Label>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;
    const form = new FormData(event.currentTarget);
    const price = String(form.get("price") ?? "");
    const activeVariants = variantsEnabled ? variants : [];
    const details = Object.fromEntries(
      detailFields.map(([key]) => [key, String(form.get(key) ?? "")]),
    );
    if (!images.length || !price || !details.description.trim()) {
      toast.error("Products need an image, product price, and description.");
      return;
    }
    if (
      activeVariants.some(
        (item) =>
          !item.title.trim() ||
          (item.type === "image-swatch" && !item.image) ||
          (item.type === "color-swatch" && !item.colorHex) ||
          (item.priceMode === "custom" && !item.price),
      )
    ) {
      toast.error("Complete each option before saving.");
      return;
    }
    const name = String(form.get("name")).trim();
    setSaving(true);
    try {
      await onSave({
        version: product?.version,
        id: product?.id ?? crypto.randomUUID(),
        name,
        brand: String(form.get("brand")).trim(),
        slug: String(form.get("slug")).trim(),
        category,
        variants: activeVariants,
        images: images.map((image) => ({
          ...image,
          alt: image.alt.trim() || `Product image for ${name}`,
        })),
        detailImages,
        price,
        rating: String(form.get("rating") ?? ""),
        reviewCount: String(form.get("reviewCount") ?? ""),
        soldCount: String(form.get("soldCount") ?? ""),
        leads: product?.leads ?? 0,
      featuredProduct: product?.featuredProduct ?? false,
      discountPrice: product?.discountPrice ?? "0.00",
      discountBadge: product?.discountBadge ?? "none",
        details,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving && !uploading) onClose();
      }}
    >
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 p-0 sm:max-w-4xl">
        <div className="border-b px-5 py-5 pr-12 sm:px-7">
          <DialogTitle className="text-xl font-semibold">
            {product ? "Edit product" : "Add product"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Product details are saved to the catalog.
          </DialogDescription>
        </div>
        <form
          onSubmit={submit}
          className="min-h-0 overflow-y-auto [&_input]:h-12 [&_input]:rounded-none [&_input]:px-3 [&_select]:h-12 [&_select]:rounded-none [&_textarea]:min-h-32 [&_textarea]:rounded-none [&_textarea]:px-3"
        >
          <fieldset disabled={saving || uploading} className="min-w-0">
            <div className="flex flex-col gap-8 px-5 py-6 sm:px-7">
              <fieldset className="order-1 space-y-4">
                <legend className="mb-4 text-base font-semibold">
                  General information
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {input("name", "Product name", {
                    required: true,
                    value: product?.name,
                    maxLength: 200,
                  })}
                  {input("brand", "Brand", {
                    value: product?.brand,
                    maxLength: 100,
                  })}
                  {input("slug", "URL slug", {
                    required: true,
                    value: product?.slug,
                    maxLength: 220,
                    validate: (value) =>
                      value && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
                        ? "Use lowercase letters, numbers, and hyphens only."
                        : null,
                  })}
                  <div className="space-y-2">
                    <Label htmlFor="product-category">Category</Label>
                    <select
                      id="product-category"
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value as ProductCategory)
                      }
                      className={selectClass}
                    >
                      {Object.values(ProductCategory).map((value) => (
                        <option key={value} value={value}>
                          {categoryLabels[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>
              <fieldset className="order-2 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <legend className="text-base font-semibold">
                    Product details
                  </legend>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={variantsEnabled}
                    aria-label="Enable variants and options"
                    onClick={() => setVariantsActive(!variantsEnabled)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${variantsEnabled ? "bg-black" : "bg-muted-foreground/30"}`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${variantsEnabled ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {detailFields.map(([field, label]) =>
                    detailField(field, label),
                  )}
                </div>
              </fieldset>
              {variantsEnabled && (
                <fieldset className="order-3 space-y-4">
                  <legend className="text-base font-semibold">
                    Variants & options
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="variant-type">Option type</Label>
                      <select
                        id="variant-type"
                        value={optionType}
                        onChange={(event) =>
                          changeType(event.target.value as ProductOptionType)
                        }
                        className={selectClass}
                      >
                        {optionTypes.map((type) => (
                          <option key={type} value={type}>
                            {optionTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {variants.map((item, index) => (
                      <div key={index} className="border p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            {optionTypeLabels[optionType]} option {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={
                              "text-destructive hover:bg-red-600 hover:text-primary-foreground bg-white rounded-none border-border border"
                            }
                            style={{
                              boxShadow:
                                "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
                            }}
                            aria-label={`Remove option ${index + 1}`}
                            onClick={() =>
                              setVariants((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                          >
                            <Trash2 strokeWidth={2} />
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor={`variant-${index}-title`}>
                              Title
                            </Label>
                            <Input
                              id={`variant-${index}-title`}
                              value={item.title}
                              maxLength={100}
                              onChange={(event) =>
                                updateVariant(index, {
                                  title: event.target.value,
                                })
                              }
                              placeholder={
                                optionType === "size"
                                  ? "e.g. Medium"
                                  : optionType === "pack-count"
                                    ? "e.g. 24 pack"
                                    : "Option title"
                              }
                            />
                          </div>
                          {optionType === "color-swatch" && (
                            <div className="space-y-2">
                              <Label htmlFor={`variant-${index}-color`}>
                                Color
                              </Label>
                              <div className="flex h-12 border">
                                <input
                                  id={`variant-${index}-color`}
                                  aria-label="Color picker"
                                  type="color"
                                  value={item.colorHex || "#000000"}
                                  className="h-full w-12 cursor-pointer border-0 p-1"
                                  onChange={(event) =>
                                    updateVariant(index, {
                                      colorHex: event.target.value,
                                    })
                                  }
                                />
                                <Input
                                  value={item.colorHex}
                                  maxLength={7}
                                  className="h-full border-0"
                                  placeholder="#000000"
                                  onChange={(event) =>
                                    updateVariant(index, {
                                      colorHex: event.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                          {optionType === "image-swatch" && (
                            <div className="space-y-2">
                              <Label>Swatch image</Label>
                              {item.image ? (
                                <div className="relative size-12 overflow-hidden border">
                                  <Image
                                    src={item.image.url}
                                    alt="Option swatch"
                                    fill
                                    unoptimized
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Remove swatch image"
                                    className="absolute right-0 top-0 size-6 rounded-none"
                                    onClick={() =>
                                      updateVariant(index, { image: null })
                                    }
                                  >
                                    <X />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Input
                                    id={`variant-${index}-image`}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/avif"
                                    className="sr-only"
                                    onChange={(event) => {
                                      void uploadSwatch(
                                        index,
                                        event.target.files?.[0],
                                      );
                                      event.target.value = "";
                                    }}
                                  />
                                  <Label
                                    htmlFor={`variant-${index}-image`}
                                    style={{
                                      boxShadow:
                                        "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                                    }}
                                    className="inline-flex h-12 cursor-pointer items-center bg-black px-5 text-sm font-semibold text-white hover:bg-black/85"
                                  >
                                    Upload image
                                  </Label>
                                </>
                              )}
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor={`variant-${index}-price-mode`}>
                              Price
                            </Label>
                            <select
                              id={`variant-${index}-price-mode`}
                              value={item.priceMode}
                              onChange={(event) =>
                                updateVariant(index, {
                                  priceMode: event.target.value as
                                    | "same"
                                    | "custom",
                                  price:
                                    event.target.value === "same"
                                      ? ""
                                      : item.price,
                                })
                              }
                              className={selectClass}
                            >
                              <option value="same">Same as product</option>
                              <option value="custom">Custom price</option>
                            </select>
                          </div>
                          {item.priceMode === "custom" && (
                            <div className="space-y-2">
                              <Label htmlFor={`variant-${index}-price`}>
                                Custom price (USD)
                              </Label>
                              <Input
                                id={`variant-${index}-price`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(event) =>
                                  updateVariant(index, {
                                    price: event.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    className="h-12 gap-2 rounded-none bg-black px-6 text-sm font-semibold text-white hover:bg-black/85"
                    style={{
                      boxShadow:
                        "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                    }}
                    onClick={() =>
                      setVariants((current) => [
                        ...current,
                        emptyVariant(optionType),
                      ])
                    }
                  >
                    <Plus />
                    Add option
                  </Button>
                </fieldset>
              )}
              <fieldset className="order-4 grid gap-4 sm:grid-cols-2">
                <legend className="mb-4 text-base font-semibold">
                  Sales details
                </legend>
                {numberField({
                  name: "price",
                  label: "Price (USD)",
                  value: product?.price,
                  max: 9_999_999.99,
                  step: "0.01",
                })}
                {numberField({
                  name: "rating",
                  label: "Average rating (out of 5)",
                  value: product?.rating,
                  max: 5,
                  step: "0.1",
                })}
                {numberField({
                  name: "reviewCount",
                  label: "Review count",
                  value: product?.reviewCount,
                  max: 2_147_483_647,
                })}
                {numberField({
                  name: "soldCount",
                  label: "Sold count",
                  value: product?.soldCount,
                  max: 2_147_483_647,
                })}
              </fieldset>
              <fieldset className="order-5 space-y-4">
                <legend className="mb-2 text-base font-semibold">
                  Images & media
                </legend>
                <Label htmlFor="product-images" className="sr-only">
                  Upload product images
                </Label>
                <Input
                  id="product-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  disabled={saving || uploading || images.length >= 8}
                  onChange={(event) => {
                    void uploadGallery(event.target.files);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
                <Label
                  htmlFor="product-images"
                  aria-disabled={saving || uploading || images.length >= 8}
                  className="inline-flex h-12 cursor-pointer items-center bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-black/85 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  style={{
                    boxShadow:
                      "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                  }}
                >
                  Choose files
                </Label>
                {uploading && (
                  <div
                    role="status"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Spinner aria-hidden="true" />
                    {uploadStatus}
                  </div>
                )}
                {!images.length && (
                  <div className="border border-dashed p-5 text-sm italic text-muted-foreground">
                    No images yet. Upload up to 8 JPEG, PNG, WebP, or AVIF
                    images, 3 MB each.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((image, index) => (
                    <div
                      key={image.assetId}
                      draggable
                      onDragStart={() => setDraggedImageId(image.assetId)}
                      onDragEnd={() => setDraggedImageId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedImageId && draggedImageId !== image.assetId)
                          reorderImages(draggedImageId, image.assetId);
                        setDraggedImageId(null);
                      }}
                      className={`group relative aspect-square cursor-grab overflow-hidden border bg-muted active:cursor-grabbing ${draggedImageId === image.assetId ? "opacity-60" : ""}`}
                    >
                      <Image
                        src={image.url}
                        alt={image.alt || "Product image"}
                        fill
                        unoptimized
                        sizes="(min-width: 1024px) 180px, 40vw"
                        className="object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 bg-black px-2 py-1 text-xs font-medium text-white">
                          Main image
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        aria-label="Remove image"
                        className="absolute right-2 top-2 size-9 rounded-none border border-white/30 bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                        onClick={() =>
                          setImages((current) =>
                            current.filter(
                              (item) => item.assetId !== image.assetId,
                            ),
                          )
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-card p-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-none px-6 text-sm font-semibold"
                disabled={saving || uploading}
                style={{
                  boxShadow:
                    "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                }}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                style={{
                  boxShadow:
                    "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                }}
                className="h-12 gap-2 rounded-none px-6 text-sm font-semibold"
                disabled={saving || uploading}
              >
                {saving ? (
                  <>
                    Saving <Spinner aria-hidden="true" />
                  </>
                ) : product ? (
                  "Save product"
                ) : (
                  "Create product"
                )}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
