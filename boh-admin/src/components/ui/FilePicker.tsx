import { useRef, useState, type ReactNode } from "react";
import { text } from "@/constants/text";
import { Reveal } from "./Reveal";
import { IconUpload, IconX } from "./icons";
import { inputClass } from "./styles";

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// Single control for "attach a file or paste a URL". Shows an upload button by
// default, a chip once a file or URL is present, and a progress bar mid-upload.
export function FilePicker({
  accept,
  file,
  url,
  onFile,
  onUrl,
  uploadLabel,
  progress,
}: {
  accept: string;
  file: File | null;
  url: string;
  onFile: (file: File | null) => void;
  onUrl: (url: string) => void;
  uploadLabel: string;
  progress?: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const openPicker = () => inputRef.current?.click();

  let body: ReactNode;
  if (file) {
    body = (
      <div className="rounded-card border border-border bg-background px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {progress !== undefined
                ? `${text.common.uploading} ${Math.round(progress * 100)}%`
                : formatBytes(file.size)}
            </p>
          </div>
          {progress === undefined ? (
            <button
              type="button"
              aria-label={text.content.removeFile}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onFile(null)}
            >
              <IconX />
            </button>
          ) : null}
        </div>
        {progress !== undefined ? (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    );
  } else if (urlMode) {
    body = (
      <Reveal className="space-y-1.5">
        <input
          className={inputClass}
          placeholder={text.content.urlPlaceholder}
          aria-label={uploadLabel}
          value={url}
          onChange={(event) => onUrl(event.target.value)}
        />
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setUrlMode(false)}
        >
          {text.content.uploadFileInstead}
        </button>
      </Reveal>
    );
  } else if (url) {
    body = (
      <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-background px-3 py-2">
        <p className="min-w-0 truncate text-sm font-normal text-muted-foreground">{url}</p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={openPicker}
          >
            {text.content.replaceAction}
          </button>
          <button
            type="button"
            aria-label={text.content.removeFile}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onUrl("")}
          >
            <IconX />
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-2 rounded-card border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
        >
          <IconUpload />
          {uploadLabel}
        </button>
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground hover:text-primary"
          onClick={() => setUrlMode(true)}
        >
          {text.content.pasteUrlInstead}
        </button>
      </div>
    );
  }

  return (
    <div>
      {body}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          setUrlMode(false);
          event.target.value = "";
        }}
      />
    </div>
  );
}
