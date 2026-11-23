"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

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
  const slug = title === category?.title ? category.slug : catalogCategorySlug(title);

  async function upload(file?: File) {
    if (!file || busy) return;
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
            <Label htmlFor="category-cover">Cover image</Label>
            {cover && <Image src={cover.url} width={96} height={96} unoptimized alt="" className="size-24 rounded-lg border object-contain" />}
            <Input id="category-cover" type="file" accept={catalogImageTypes.join(",")} disabled={Boolean(busy)}
              className="h-12 rounded-none" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void upload(file);
              }} />
            {busy === "upload" && <p className="flex items-center gap-2" role="status"><Spinner aria-hidden="true" /> Uploading cover image</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-title">Title</Label>
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
