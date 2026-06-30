const AUDIO_EXTENSIONS = ["mp3", "m4a", "wav", "aac", "ogg"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "mkv"];

function extensionOf(url: string): string | undefined {
  return url.split("?")[0].split(".").pop()?.toLowerCase();
}

// Best-effort guess of whether a media URL points at video.
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const ext = extensionOf(url);
  return !!ext && VIDEO_EXTENSIONS.includes(ext);
}

// Best-effort guess of whether a media URL points at audio (vs video), used to
// choose between the video and audio players for vault content.
export function isAudioUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const ext = extensionOf(url);
  return !!ext && AUDIO_EXTENSIONS.includes(ext);
}
