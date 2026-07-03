import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { text } from "@/constants/text";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

type CommunityPost = Tables<"community_posts">;
type Course = Pick<Tables<"courses">, "id" | "title">;
type PostReply = Tables<"post_replies">;
type Profile = Tables<"profiles">;

type PendingDelete =
  { type: "post"; post: CommunityPost; replies: PostReply[] } | { type: "reply"; reply: PostReply };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return text.common.somethingWentWrong;
}

function authorName(profiles: Map<string, Profile>, userId: string): string {
  const profile = profiles.get(userId);
  return profile?.name ?? text.moderation.unknownAuthor;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function communityMediaPath(mediaUrl: string | null): string | null {
  if (!mediaUrl) return null;

  const bucketPrefix = "community-media/";
  const trimmed = mediaUrl.trim();
  const directBucketIndex = trimmed.indexOf(bucketPrefix);
  if (directBucketIndex >= 0) {
    return decodeURIComponent(trimmed.slice(directBucketIndex + bucketPrefix.length).split("?")[0]);
  }

  try {
    const url = new URL(trimmed);
    const publicPrefix = "/storage/v1/object/public/community-media/";
    const signedPrefix = "/storage/v1/object/sign/community-media/";
    const matchingPrefix = [publicPrefix, signedPrefix].find((prefix) =>
      url.pathname.includes(prefix),
    );
    if (!matchingPrefix) return null;
    return decodeURIComponent(
      url.pathname.slice(url.pathname.indexOf(matchingPrefix) + matchingPrefix.length),
    );
  } catch {
    if (!trimmed.includes("://") && trimmed.includes("/")) return trimmed;
    return null;
  }
}

async function removeCommunityMedia(mediaUrls: Array<string | null>) {
  const paths = Array.from(
    new Set(
      mediaUrls
        .map((mediaUrl) => communityMediaPath(mediaUrl))
        .filter((path): path is string => !!path),
    ),
  );
  if (paths.length === 0) return;

  const { error } = await supabase.storage.from("community-media").remove(paths);
  if (error) throw error;
}

function useCourses() {
  return useQuery({
    queryKey: ["moderation", "courses"],
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase.from("courses").select("id,title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useProfiles() {
  return useQuery({
    queryKey: ["moderation", "profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useFeed(courseId: string | null) {
  return useQuery({
    queryKey: ["moderation", "feed", courseId],
    queryFn: async (): Promise<{ posts: CommunityPost[]; replies: PostReply[] }> => {
      let postsQuery = supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });
      postsQuery =
        courseId === null ? postsQuery.is("course_id", null) : postsQuery.eq("course_id", courseId);

      const { data: posts, error: postsError } = await postsQuery;
      if (postsError) throw postsError;
      const safePosts = posts ?? [];
      if (safePosts.length === 0) return { posts: [], replies: [] };

      const { data: replies, error: repliesError } = await supabase
        .from("post_replies")
        .select("*")
        .in(
          "post_id",
          safePosts.map((post) => post.id),
        )
        .order("created_at", { ascending: true });
      if (repliesError) throw repliesError;

      return { posts: safePosts, replies: replies ?? [] };
    },
  });
}

export function ModerationPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const queryClient = useQueryClient();
  const courses = useCourses();
  const profiles = useProfiles();
  const feed = useFeed(selectedCourseId);

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const profile of profiles.data ?? []) map.set(profile.id, profile);
    return map;
  }, [profiles.data]);

  const repliesByPostId = useMemo(() => {
    const map = new Map<string, PostReply[]>();
    for (const reply of feed.data?.replies ?? []) {
      const postReplies = map.get(reply.post_id) ?? [];
      postReplies.push(reply);
      map.set(reply.post_id, postReplies);
    }
    return map;
  }, [feed.data?.replies]);

  const deleteMutation = useMutation({
    mutationFn: async (item: PendingDelete) => {
      if (item.type === "reply") {
        await removeCommunityMedia([item.reply.media_url]);
        const { error } = await supabase.from("post_replies").delete().eq("id", item.reply.id);
        if (error) throw error;
        return;
      }

      await removeCommunityMedia([
        item.post.media_url,
        ...item.replies.map((reply) => reply.media_url),
      ]);
      const { error } = await supabase.from("community_posts").delete().eq("id", item.post.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["moderation", "feed", selectedCourseId] });
    },
  });

  const isLoading = courses.isLoading || profiles.isLoading || feed.isLoading;
  const loadError = courses.error ?? profiles.error ?? feed.error;
  const selectedFeedName =
    selectedCourseId === null
      ? text.moderation.globalFeed
      : (courses.data?.find((course) => course.id === selectedCourseId)?.title ??
        text.moderation.selectedCourse);

  return (
    <div className="max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{text.moderation.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.moderation.description}</p>
      </header>

      <div className="mt-6 max-w-sm">
        <label className="block text-sm font-medium text-foreground" htmlFor="moderation-feed">
          {text.moderation.feedLabel}
        </label>
        <select
          id="moderation-feed"
          className="mt-2 w-full rounded-card border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={selectedCourseId ?? "global"}
          onChange={(event) =>
            setSelectedCourseId(event.target.value === "global" ? null : event.target.value)
          }
        >
          <option value="global">{text.moderation.globalFeed}</option>
          {(courses.data ?? []).map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {loadError ? (
        <div
          className="mt-4 rounded-card border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          <p className="font-medium">{text.moderation.loadError}</p>
          <p className="mt-1">{errorMessage(loadError)}</p>
        </div>
      ) : null}

      {deleteMutation.error ? (
        <div
          className="mt-4 rounded-card border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          <p className="font-medium">{text.moderation.deleteError}</p>
          <p className="mt-1">{errorMessage(deleteMutation.error)}</p>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="mt-4 rounded-card border border-border bg-card p-4 shadow-sm"
          role="dialog"
          aria-labelledby="confirm-delete-title"
        >
          <h2 className="text-base font-semibold text-foreground" id="confirm-delete-title">
            {text.moderation.confirmTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {pendingDelete.type === "post" ? text.moderation.confirmPost : text.moderation.confirmReply}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="rounded-card border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => setPendingDelete(null)}
              disabled={deleteMutation.isPending}
            >
              {text.moderation.cancel}
            </button>
            <button
              type="button"
              className="rounded-card bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              onClick={() => deleteMutation.mutate(pendingDelete)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? text.moderation.deleting : text.moderation.confirm}
            </button>
          </div>
        </div>
      ) : null}

      <section className="mt-8" aria-label={selectedFeedName}>
        {isLoading ? <p className="text-sm text-muted-foreground">{text.moderation.loading}</p> : null}
        {!isLoading && !loadError && (feed.data?.posts.length ?? 0) === 0 ? (
          <p className="rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">
            {text.moderation.empty}
          </p>
        ) : null}

        <div className="space-y-5">
          {(feed.data?.posts ?? []).map((post) => {
            const replies = repliesByPostId.get(post.id) ?? [];
            return (
              <article
                key={post.id}
                className="rounded-card border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      {authorName(profileMap, post.user_id)}
                    </h2>
                    <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-card border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDelete({ type: "post", post, replies })}
                  >
                    {text.moderation.deletePost}
                  </button>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">
                  {post.body || text.moderation.noBody}
                </p>
                {post.media_url ? (
                  <a
                    className="mt-3 inline-block text-sm font-medium text-primary underline"
                    href={post.media_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {text.moderation.media}
                  </a>
                ) : null}

                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {text.moderation.replies} ({replies.length})
                  </h3>
                  {replies.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">{text.moderation.noReplies}</p>
                  ) : null}
                  <div className="mt-3 space-y-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="rounded-card bg-muted p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {authorName(profileMap, reply.user_id)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(reply.created_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="rounded-card border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                            onClick={() => setPendingDelete({ type: "reply", reply })}
                          >
                            {text.moderation.deleteReply}
                          </button>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                          {reply.body || text.moderation.noBody}
                        </p>
                        {reply.media_url ? (
                          <a
                            className="mt-2 inline-block text-sm font-medium text-primary underline"
                            href={reply.media_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {text.moderation.media}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
