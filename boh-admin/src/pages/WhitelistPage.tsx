import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

type Course = Pick<Tables<"courses">, "id" | "title" | "start_date">;
type WhitelistRow = Pick<Tables<"course_whitelist">, "course_id" | "created_at" | "user_id">;
type User = Pick<Tables<"users">, "id" | "email" | "name">;

type WhitelistedUser = WhitelistRow & { user: User | null };

const copy = {
  title: "Whitelist",
  subtitle: "Manage course access by adding existing user accounts to each course.",
  courseLabel: "Course",
  loading: "Loading whitelist",
  loadError: "Could not load whitelist data. Please try again.",
  emptyCourses: "Create a course before adding users to a whitelist.",
  emptyUsers: "No users have access to this course yet.",
  addTitle: "Add user access",
  emailLabel: "User email",
  emailPlaceholder: "student@example.com",
  add: "Add to whitelist",
  adding: "Adding",
  remove: "Remove",
  removing: "Removing",
  emailRequired: "Enter an email address before adding a user.",
  userNotFound: "No user account matches that email. The account must exist first.",
  courseRequired: "Choose a course before adding a user.",
  confirmRemove: "Remove this user from the course whitelist?",
  mutationErrorPrefix: "Supabase error:",
  unknownUser: "Unknown user",
  accessSince: "Access since",
};

export function WhitelistPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [rows, setRows] = useState<WhitelistedUser[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const selectedUsers = useMemo(
    () => rows.filter((row) => row.course_id === selectedCourseId),
    [rows, selectedCourseId],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [coursesResult, whitelistResult] = await Promise.all([
      supabase.from("courses").select("id, title, start_date").order("title", { ascending: true }),
      supabase
        .from("course_whitelist")
        .select("course_id, user_id, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (coursesResult.error) throw coursesResult.error;
    if (whitelistResult.error) throw whitelistResult.error;

    const whitelistRows = whitelistResult.data ?? [];
    const userIds = Array.from(new Set(whitelistRows.map((row) => row.user_id)));
    let usersById = new Map<string, User>();

    if (userIds.length > 0) {
      const usersResult = await supabase.from("users").select("id, email, name").in("id", userIds);
      if (usersResult.error) throw usersResult.error;
      usersById = new Map((usersResult.data ?? []).map((user) => [user.id, user]));
    }

    const nextCourses = coursesResult.data ?? [];
    setCourses(nextCourses);
    setRows(whitelistRows.map((row) => ({ ...row, user: usersById.get(row.user_id) ?? null })));
    setSelectedCourseId((current) => {
      if (current && nextCourses.some((course) => course.id === current)) return current;
      return nextCourses[0]?.id ?? "";
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadData();
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : copy.loadError);
        setIsLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!selectedCourseId) {
      setMutationError(copy.courseRequired);
      return;
    }
    if (!trimmedEmail) {
      setMutationError(copy.emailRequired);
      return;
    }

    setIsAdding(true);
    const userResult = await supabase
      .from("users")
      .select("id, email, name")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (userResult.error) {
      setMutationError(userResult.error.message);
      setIsAdding(false);
      return;
    }
    if (!userResult.data) {
      setMutationError(copy.userNotFound);
      setIsAdding(false);
      return;
    }

    const { error } = await supabase.from("course_whitelist").insert({
      course_id: selectedCourseId,
      user_id: userResult.data.id,
    });

    if (error) {
      setMutationError(error.message);
      setIsAdding(false);
      return;
    }

    setEmail("");
    try {
      await loadData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : copy.loadError);
      setIsLoading(false);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(row: WhitelistedUser) {
    if (!window.confirm(copy.confirmRemove)) return;

    setMutationError(null);
    setRemovingUserId(row.user_id);
    const { error } = await supabase
      .from("course_whitelist")
      .delete()
      .eq("course_id", row.course_id)
      .eq("user_id", row.user_id);

    if (error) {
      setMutationError(error.message);
      setRemovingUserId(null);
      return;
    }

    setRows((current) =>
      current.filter((item) => item.course_id !== row.course_id || item.user_id !== row.user_id),
    );
    setRemovingUserId(null);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
      </header>

      {loadError ? (
        <p className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {copy.loadError} {loadError}
        </p>
      ) : null}

      {isLoading ? <p className="text-sm text-muted-foreground">{copy.loading}</p> : null}

      {!isLoading && courses.length === 0 ? (
        <p className="rounded-card border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          {copy.emptyCourses}
        </p>
      ) : null}

      {!isLoading && courses.length > 0 ? (
        <>
          <section className="rounded-card border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div>
                <label className="block text-sm font-medium text-foreground" htmlFor="course">
                  {copy.courseLabel}
                </label>
                <select
                  id="course"
                  className="mt-2 w-full rounded-card border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {selectedCourse ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {selectedUsers.length} user{selectedUsers.length === 1 ? "" : "s"} whitelisted
                    {selectedCourse.start_date ? ` for the ${selectedCourse.start_date} start date` : ""}.
                  </p>
                ) : null}
              </div>

              <form onSubmit={(event) => void handleAdd(event)}>
                <h2 className="text-sm font-semibold text-foreground">{copy.addTitle}</h2>
                <label className="mt-3 block text-sm font-medium text-foreground" htmlFor="email">
                  {copy.emailLabel}
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="email"
                    className="min-w-0 flex-1 rounded-card border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={copy.emailPlaceholder}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isAdding}
                  >
                    {isAdding ? copy.adding : copy.add}
                  </button>
                </div>
              </form>
            </div>

            {mutationError ? (
              <p className="mt-5 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {copy.mutationErrorPrefix} {mutationError}
              </p>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-card border border-border bg-card shadow-sm">
            {selectedUsers.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">{copy.emptyUsers}</p>
            ) : (
              <ul className="divide-y divide-border">
                {selectedUsers.map((row) => {
                  const userName = row.user?.name || row.user?.email || copy.unknownUser;
                  return (
                    <li key={`${row.course_id}:${row.user_id}`} className="flex gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{userName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.user?.email ?? row.user_id}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {copy.accessSince} {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="self-start rounded-card border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={removingUserId === row.user_id}
                        onClick={() => void handleRemove(row)}
                      >
                        {removingUserId === row.user_id ? copy.removing : copy.remove}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
