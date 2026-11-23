"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { RequiredMark } from "./required-mark";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

import { catalogCategorySlug, type CatalogCategory } from "@/data/catalog-data";

import { catalogImageTypes, uploadCatalogImage } from "@/lib/catalog-image";

export default function CatalogCategoryEditor({ category, onClose, onSave }: {
  category: CatalogCategory | null;
  onClose: () => void;
  onSave: (title: string, coverAssetId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(category?.title ?? "");
  const [cover, setCover] = useState(category ? { assetId: category.coverAssetId, url: category.coverUrl } : null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const slug = title === category?.title ? category.slug : catalogCategorySlug(title);

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    if (cover || files.length !== 1) {
      setError("Only one cover image is allowed. Remove the current image before uploading another.");
      return;
    }
    const file = files[0];
    setError("");
    setBusy("upload");
    try {
      setCover(await uploadCatalogImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload cover image.");
    } finally {
      setBusy(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !slug || !cover) return;
    setError("");
    setBusy("save");
    try {
      await onSave(title.trim(), cover.assetId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save category.");
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent showCloseButton={!busy} className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle className="text-xl font-semibold">{category ? "Edit Category" : "Add Category"}</DialogTitle>
        <DialogDescription className="sr-only">Enter the category title and upload a cover image.</DialogDescription>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-title">Title<RequiredMark /></Label>
            <Input id="category-title" value={title} onChange={(event) => setTitle(event.target.value)}
              disabled={Boolean(busy)} maxLength={120} required className="h-12 rounded-none" />
            {title.trim() && !slug && <p className="text-destructive">Enter a title that can form a URL.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-url">Frontend URL</Label>
            <Input id="category-url" value={slug ? `/${slug}` : ""} placeholder="Generated from the title" disabled className="h-12 rounded-none" />
            {category && slug && slug !== category.slug && (
              <p className="text-muted-foreground">Saving will change the category URL and update its product links.</p>
            )}
          </div>
          <fieldset className="space-y-4">
            <legend className="mb-2 text-base font-semibold">Cover Image<RequiredMark /></legend>
            <Input ref={coverInput} type="file" accept={catalogImageTypes.join(",")}
              aria-label="Upload category cover image" disabled={Boolean(busy) || Boolean(cover)}
              className="hidden" onChange={(event) => {
                void upload(event.currentTarget.files);
                event.currentTarget.value = "";
              }} />
            <Button type="button" disabled={Boolean(busy) || Boolean(cover)}
              className="h-12 rounded-none bg-black px-6 text-sm font-semibold text-white hover:bg-black/85"
              style={{ boxShadow: "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px" }}
              onClick={() => coverInput.current?.click()}>
              Choose file
            </Button>
            {busy === "upload" && (
              <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner aria-hidden="true" /> Uploading cover image
              </div>
            )}
            {cover ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-square overflow-hidden border bg-muted">
                  <Image src={cover.url} alt="Category cover image" fill unoptimized sizes="(min-width: 640px) 230px, 45vw" className="object-cover" />
                  <span className="absolute left-2 top-2 bg-black px-2 py-1 text-xs font-medium text-white">Cover image</span>
                  <Button type="button" variant="destructive" size="icon" aria-label="Remove cover image"
                    disabled={Boolean(busy)}
                    className="absolute right-2 top-2 size-9 rounded-none border border-white/30 bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                    onClick={() => { setCover(null); setError(""); }}>
                    <X />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed p-5 text-sm italic text-muted-foreground">
                No cover image yet. Upload one JPEG, PNG, WebP, or AVIF image, up to 3 MB.
              </div>
            )}
          </fieldset>
          {error && <p className="text-destructive" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" className="h-11 rounded-none" disabled={Boolean(busy)} onClick={onClose}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-none" disabled={Boolean(busy) || !slug || !cover ||
              (title.trim() === category?.title && cover.assetId === category.coverAssetId)}>
              {busy === "save" && <Spinner aria-hidden="true" />}{busy === "save" ? "Saving…" : "Save category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
