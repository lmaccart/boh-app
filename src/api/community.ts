import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";

import { queryKeys } from "./keys";
import type { CommunityPostRow, PostReplyRow } from "./types";

// Feed for a course (courseId) or the global Business of Happiness feed
// (courseId === null). RLS gates course feeds to whitelisted users. Author
// display info is resolved from the profiles map (see useProfileMap).
export function usePosts(courseId: string | null) {
  return useQuery({
    queryKey: queryKeys.posts(courseId),
    queryFn: async (): Promise<CommunityPostRow[]> => {
      let query = supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });
      query = courseId === null ? query.is("course_id", null) : query.eq("course_id", courseId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: postId ? queryKeys.post(postId) : ["posts", "detail", "none"],
    enabled: !!postId,
    queryFn: async (): Promise<CommunityPostRow | null> => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("id", postId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePostReplies(postId: string | undefined) {
  return useQuery({
    queryKey: postId ? queryKeys.postReplies(postId) : ["posts", "none", "replies"],
    enabled: !!postId,
    queryFn: async (): Promise<PostReplyRow[]> => {
      const { data, error } = await supabase
        .from("post_replies")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePost() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId,
      body,
      mediaUrl,
    }: {
      courseId: string | null;
      body: string | null;
      mediaUrl: string | null;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: userId, course_id: courseId, body, media_url: mediaUrl })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { courseId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.posts(courseId) });
    },
  });
}

export function useCreateReply() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      body,
      mediaUrl,
    }: {
      postId: string;
      body: string | null;
      mediaUrl: string | null;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("post_replies")
        .insert({ post_id: postId, user_id: userId, body, media_url: mediaUrl })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.postReplies(postId) });
    },
  });
}
