import { createHash } from "node:crypto";

import { env } from "../config/env.js";

export const uploadsConfigured = () =>
  !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
async function cloudRequest(
  action: "upload" | "destroy",
  parameters: Record<string, string>,
  bytes?: Buffer,
) {
  const values = {
    ...parameters,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const signature = createHash("sha256")
    .update(
      Object.entries(values)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&") + env.CLOUDINARY_API_SECRET,
    )
    .digest("hex");
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  form.set("api_key", env.CLOUDINARY_API_KEY);
  form.set("signature", signature);
  if (bytes) form.set("file", new Blob([new Uint8Array(bytes)]), "image");
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/${action}`,
    { method: "POST", body: form, signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error("Image storage request failed.");
  return response.json();
}
export async function uploadImage(
  publicId: string,
  bytes: Buffer,
): Promise<string> {
  const result = await cloudRequest(
    "upload",
    {
      public_id: publicId,
      overwrite: "false",
      allowed_formats: "jpg,png,webp,avif",
      transformation: "c_limit,w_2400,h_2400/q_auto",
      format: "webp",
    },
    bytes,
  );
  if (
    result.public_id !== publicId ||
    !result.secure_url?.startsWith(
      `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`,
    ) ||
    !result.width ||
    !result.height
  )
    throw new Error("Invalid image storage response.");
  return result.secure_url;
}
export async function destroyImage(publicId: string) {
  const result = await cloudRequest("destroy", {
    public_id: publicId,
    invalidate: "true",
  });
  if (!["ok", "not found"].includes(result.result))
    throw new Error("Image deletion failed.");
}
export function supportedImage(bytes: Buffer) {
  return (
    (bytes.length > 3 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255) ||
    (bytes.length > 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (bytes.length > 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") ||
    (bytes.length > 12 && bytes.toString("ascii", 4, 12) === "ftypavif") ||
    (bytes.length > 12 && bytes.toString("ascii", 4, 12) === "ftypavis")
  );
}
