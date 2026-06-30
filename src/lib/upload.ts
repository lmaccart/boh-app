import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";

export type PickedMedia = {
  uri: string;
  mimeType: string;
  kind: "image" | "video";
};

// Launch the system picker for a single image or video. Returns null if the
// user cancels or permission is denied.
export async function pickMedia(): Promise<PickedMedia | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
    kind: asset.type === "video" ? "video" : "image",
  };
}

function extensionFor(media: PickedMedia): string {
  const fromUri = media.uri.split(".").pop()?.split("?")[0];
  if (fromUri && fromUri.length <= 5) return fromUri;
  return media.kind === "video" ? "mp4" : "jpg";
}

// Upload picked media into a bucket under the user's own folder and return the
// public URL. Path shape (`<userId>/<file>`) matches the storage RLS policy.
export async function uploadMedia(
  media: PickedMedia,
  userId: string,
  bucket: "community-media" | "avatars" = "community-media",
): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensionFor(media)}`;
  const arrayBuffer = await fetch(media.uri).then((res) => res.arrayBuffer());

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: media.mimeType, upsert: false });
  if (error) throw error;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
