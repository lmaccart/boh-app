import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { text } from "@/constants/text";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Tables } from "@/types/database.types";

type Course = Pick<Tables<"courses">, "id" | "title">;
type Announcement = Pick<
  Tables<"announcements">,
  "id" | "body" | "course_id" | "created_at" | "posted_by"
>;

export function AnnouncementsPage() {
  const { session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [scope, setScope] = useState("app-wide");
  const [body, setBody] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const courseTitles = useMemo(
    () => new Map(courses.map((course) => [course.id, course.title])),
    [courses],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [coursesResult, announcementsResult] = await Promise.all([
      supabase.from("courses").select("id, title").order("title", { ascending: true }),
      supabase
        .from("announcements")
        .select("id, body, course_id, posted_by, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (coursesResult.error) throw coursesResult.error;
    if (announcementsResult.error) throw announcementsResult.error;

    setCourses(coursesResult.data ?? []);
    setAnnouncements(announcementsResult.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadData();
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : text.announcements.loadError);
        setIsLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationError(null);

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setMutationError(text.announcements.bodyRequired);
      return;
    }
    if (!session?.user.id) {
      setMutationError(text.announcements.sessionRequired);
      return;
    }

    setIsPublishing(true);
    const { error } = await supabase.from("announcements").insert({
      body: trimmedBody,
      course_id: scope === "app-wide" ? null : scope,
      posted_by: session.user.id,
    });

    if (error) {
      setMutationError(error.message);
      setIsPublishing(false);
      return;
    }

    setBody("");
    setScope("app-wide");
    try {
      await loadData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : text.announcements.loadError);
      setIsLoading(false);
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDelete(announcement: Announcement) {
    if (!window.confirm(text.announcements.confirmDelete)) return;

    setMutationError(null);
    setDeletingId(announcement.id);
    const { error } = await supabase.from("announcements").delete().eq("id", announcement.id);

    if (error) {
      setMutationError(error.message);
      setDeletingId(null);
      return;
    }

    setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
    setDeletingId(null);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{text.announcements.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{text.announcements.subtitle}</p>
      </header>

      <section className="rounded-card border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{text.announcements.composeTitle}</h2>
        <form className="mt-5 space-y-5" onSubmit={(event) => void handlePublish(event)}>
          <div>
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="announcement-scope"
            >
              {text.announcements.scopeLabel}
            </label>
            <select
              id="announcement-scope"
              className="mt-2 w-full max-w-md rounded-card border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="announcement-body"
            >
              {text.announcements.bodyLabel}
            </label>
            <textarea
              id="announcement-body"
              className="mt-2 min-h-32 w-full rounded-card border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={text.announcements.bodyPlaceholder}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          {mutationError ? (
            <p className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {text.common.supabaseErrorPrefix} {mutationError}
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPublishing}
          >
            {isPublishing ? text.announcements.publishing : text.announcements.publish}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">{text.announcements.existingTitle}</h2>
        </div>

        {loadError ? (
          <p className="mt-4 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {text.announcements.loadError} {loadError}
          </p>
        ) : null}

        {isLoading ? <p className="mt-4 text-sm text-muted-foreground">{text.announcements.loading}</p> : null}

        {!isLoading && !loadError && announcements.length === 0 ? (
          <p className="mt-4 rounded-card border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            {text.announcements.empty}
          </p>
        ) : null}

        {!isLoading && !loadError && announcements.length > 0 ? (
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
                    <button
                      type="button"
                      className="self-start rounded-card border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deletingId === announcement.id}
                      onClick={() => void handleDelete(announcement)}
                    >
                      {deletingId === announcement.id ? text.announcements.deleting : text.common.delete}
                    </button>
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
