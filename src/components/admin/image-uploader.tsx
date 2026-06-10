"use client";

import { useState } from "react";

type ImageUploaderProps = {
  name: string;
  defaultValue?: string;
};

export function ImageUploader({ name, defaultValue }: ImageUploaderProps) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="space-y-2">
      <input
        name={name}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Paste image URL or upload file"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            const body = new FormData();
            body.append("file", file);

            setIsUploading(true);
            try {
              const response = await fetch("/api/upload", {
                method: "POST",
                body,
              });

              const payload = (await response.json()) as { url?: string; error?: string };

              if (!response.ok || !payload.url) {
                throw new Error(payload.error || "Upload failed");
              }

              setUrl(payload.url);
            } catch (error) {
              alert(error instanceof Error ? error.message : "Upload failed");
            } finally {
              setIsUploading(false);
            }
          }}
        />
        {isUploading ? "Uploading..." : "Upload local image"}
      </label>
      {url ? <p className="text-xs text-zinc-500">Current image: {url}</p> : null}
    </div>
  );
}
