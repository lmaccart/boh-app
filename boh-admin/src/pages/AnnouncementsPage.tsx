import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, inputClass } from "@/components/ui";
import { text } from "@/constants/text";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Tables } from "@/types/database.types";

type Announcement = Pick<
  Tables<"announcements">,
  "id" | "body" | "course_id" | "created_at" | "posted_by"
>;

function errorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String(error.message);
  return String(error);
}

const announcementsQueryKey = ["announcements"] as const;

export function AnnouncementsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState("app-wide");
  const [body, setBody] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dataQuery = useQuery({
    queryKey: [...announcementsQueryKey, "data"],
    queryFn: async () => {
      const [coursesResult, announcementsResult] = await Promise.all([
        supabase.from("courses").select("id, title").order("title", { ascending: true }),
        supabase
          .from("announcements")
          .select("id, body, course_id, posted_by, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (coursesResult.error) throw coursesResult.error;
      if (announcementsResult.error) throw announcementsResult.error;

      return {
        courses: coursesResult.data ?? [],
        announcements: announcementsResult.data ?? [],
      };
    },
  });

  const courses = dataQuery.data?.courses ?? [];
  const announcements = dataQuery.data?.announcements ?? [];
  const courseTitles = new Map(courses.map((course) => [course.id, course.title]));

  const publishMutation = useMutation({
    mutationFn: async ({ body, scope }: { body: string; scope: string }) => {
      if (!session?.user.id) throw new Error(text.announcements.sessionRequired);

      const { data, error } = await supabase.from("announcements").insert({
        body,
        course_id: scope === "app-wide" ? null : scope,
        posted_by: session.user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setBody("");
      setScope("app-wide");
      void queryClient.invalidateQueries({ queryKey: announcementsQueryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: announcementsQueryKey });
      setDeletingId(null);
    },
    onError: () => {
      setDeletingId(null);
    }
  });

  async function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody) return;
    
    publishMutation.mutate({ body: trimmedBody, scope });
  }

  async function handleDelete(announcement: Announcement) {
    if (!window.confirm(text.announcements.confirmDelete)) return;
    setDeletingId(announcement.id);
    deleteMutation.mutate(announcement.id);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{text.announcements.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{text.announcements.subtitle}</p>
      </header>

      <section className="rounded-card border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{text.announcements.composeTitle}</h2>
        <form className="mt-5 space-y-5" onSubmit={(e) => void handlePublish(e)}>
          <div>
            <label className="block text-sm font-medium text-foreground" htmlFor="announcement-scope">
              {text.announcements.scopeLabel}
            </label>
            <select
              id="announcement-scope"
              className={`mt-2 max-w-md ${inputClass}`}
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="app-wide">{text.announcements.appWideOption}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground" htmlFor="announcement-body">
              {text.announcements.bodyLabel}
            </label>
            <textarea
              id="announcement-body"
              className={`mt-2 min-h-32 ${inputClass}`}
              placeholder={text.announcements.bodyPlaceholder}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          {publishMutation.error ? (
            <p className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {text.common.supabaseErrorPrefix} {errorMessage(publishMutation.error)}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={publishMutation.isPending || !body.trim()}>
            {publishMutation.isPending ? text.announcements.publishing : text.announcements.publish}
          </Button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">{text.announcements.existingTitle}</h2>
        </div>

        {dataQuery.error ? (
          <p className="mt-4 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {text.announcements.loadError} {errorMessage(dataQuery.error)}
          </p>
        ) : null}

        {deleteMutation.error ? (
          <p className="mt-4 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {text.common.supabaseErrorPrefix} {errorMessage(deleteMutation.error)}
          </p>
        ) : null}

        {dataQuery.isLoading ? <p className="mt-4 text-sm text-muted-foreground">{text.announcements.loading}</p> : null}

        {!dataQuery.isLoading && !dataQuery.error && announcements.length === 0 ? (
          <p className="mt-4 rounded-card border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            {text.announcements.empty}
          </p>
        ) : null}

        {!dataQuery.isLoading && !dataQuery.error && announcements.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-card border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {announcements.map((announcement) => {
                const audience = announcement.course_id
                  ? (courseTitles.get(announcement.course_id) ?? text.announcements.unknownCourse)
                  : text.announcements.appWideOption;
                const createdAt = new Date(announcement.created_at).toLocaleString();

                return (
                  <li key={announcement.id} className="flex gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-medium text-foreground">{audience}</span>
                        <span className="text-muted-foreground">
                          {text.announcements.createdPrefix} {createdAt}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {announcement.body}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      className="self-start"
                      disabled={deletingId === announcement.id}
                      onClick={() => void handleDelete(announcement)}
                    >
                      {deletingId === announcement.id ? text.announcements.deleting : text.common.delete}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
