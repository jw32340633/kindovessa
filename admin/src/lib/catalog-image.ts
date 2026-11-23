import type { ProductMedia } from "@/data/catalog-data";

export const catalogImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export function catalogImageError(file: File) {
  if (file.size === 0) return `${file.name} is empty. Choose a file with image data.`;
  if (file.size > 3 * 1024 * 1024)
    return `${file.name} is ${(file.size / (1024 * 1024)).toFixed(2)} MB. The limit is 3 MB per image.`;
  if (!catalogImageTypes.includes(file.type))
    return `${file.name} has an unsupported file type. Choose a JPEG, PNG, WebP, or AVIF image.`;
  return null;
}

export async function uploadCatalogImage(file: File): Promise<ProductMedia> {
  const validationError = catalogImageError(file);
  if (validationError) throw new Error(validationError);
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(`${file.name}: ${data?.error?.message ?? "The upload service did not complete the request. Try again shortly."}`);
  if (!data?.image) throw new Error("The upload service did not return an image. Try again shortly.");
  return { ...data.image, name: file.name.slice(0, 250) };
}
