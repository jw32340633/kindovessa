import type { ProductMedia } from "@/data/catalog-data";

export const catalogImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export function validCatalogImage(file: File) {
  return catalogImageTypes.includes(file.type) && file.size <= 3 * 1024 * 1024;
}

export async function uploadCatalogImage(file: File): Promise<ProductMedia> {
  if (!validCatalogImage(file))
    throw new Error("Choose a JPEG, PNG, WebP, or AVIF image up to 3 MB.");
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message ?? "Unable to upload image.");
  return { ...data.image, name: file.name.slice(0, 250) };
}
