import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, inputClass } from "@/components/ui";
import { text } from "@/constants/text";
import { errorMessage } from "@/lib/error";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

type WhitelistRow = Pick<Tables<"course_whitelist">, "course_id" | "created_at" | "user_id">;
type User = Pick<Tables<"users">, "id" | "email" | "name">;

type WhitelistedUser = WhitelistRow & { user: User | null };

const whitelistQueryKey = ["whitelist"] as const;

export function WhitelistPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [email, setEmail] = useState("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const dataQuery = useQuery({
    queryKey: [...whitelistQueryKey, "data"],
    queryFn: async () => {
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
      const rows = whitelistRows.map((row) => ({ ...row, user: usersById.get(row.user_id) ?? null }));

      return { courses: nextCourses, rows };
    },
  });

  const courses = useMemo(() => dataQuery.data?.courses ?? [], [dataQuery.data?.courses]);
  const rows = useMemo(() => dataQuery.data?.rows ?? [], [dataQuery.data?.rows]);

  // Initialize selectedCourseId when data loads if not already set
  useMemo(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    } else if (selectedCourseId && !courses.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId(courses[0]?.id ?? "");
    }
  }, [courses, selectedCourseId]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const selectedUsers = useMemo(
    () => rows.filter((row) => row.course_id === selectedCourseId),
    [rows, selectedCourseId],
  );

  const addMutation = useMutation({
    mutationFn: async ({ email, courseId }: { email: string; courseId: string }) => {
      const userResult = await supabase
        .from("users")
        .select("id, email, name")
        .eq("email", email)
        .maybeSingle();

      if (userResult.error) throw userResult.error;
      if (!userResult.data) throw new Error(text.whitelist.userNotFound);

      const { error } = await supabase.from("course_whitelist").insert({
        course_id: courseId,
        user_id: userResult.data.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: whitelistQueryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (row: WhitelistedUser) => {
      const { error } = await supabase
        .from("course_whitelist")
        .delete()
        .eq("course_id", row.course_id)
        .eq("user_id", row.user_id);

      if (error) throw error;
      return row;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: whitelistQueryKey });
      setRemovingUserId(null);
    },
    onError: () => {
      setRemovingUserId(null);
    }
  });

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!selectedCourseId) {
      // Handled via required / state, but just in case
      return;
    }
    if (!trimmedEmail) return;

    addMutation.mutate({ email: trimmedEmail, courseId: selectedCourseId });
  }

  function handleRemove(row: WhitelistedUser) {
    if (!window.confirm(text.whitelist.confirmRemove)) return;
    setRemovingUserId(row.user_id);
    removeMutation.mutate(row);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{text.whitelist.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{text.whitelist.subtitle}</p>
      </header>

      {dataQuery.error ? (
        <p className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {text.whitelist.loadError} {errorMessage(dataQuery.error)}
        </p>
      ) : null}

      {dataQuery.isLoading ? <p className="text-sm text-muted-foreground">{text.whitelist.loading}</p> : null}

      {!dataQuery.isLoading && !dataQuery.error && courses.length === 0 ? (
        <p className="rounded-card border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          {text.whitelist.emptyCourses}
        </p>
      ) : null}

      {!dataQuery.isLoading && !dataQuery.error && courses.length > 0 ? (
        <>
          <section className="rounded-card border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div>
                <label className="block text-sm font-medium text-foreground" htmlFor="course">
                  {text.whitelist.courseLabel}
                </label>
                <select
                  id="course"
                  className={`mt-2 ${inputClass}`}
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
                    {text.whitelist.userCountCaption(selectedUsers.length, selectedCourse.start_date)}
                  </p>
                ) : null}
              </div>

              <form onSubmit={handleAdd}>
                <h2 className="text-sm font-semibold text-foreground">{text.whitelist.addTitle}</h2>
                <label className="mt-3 block text-sm font-medium text-foreground" htmlFor="email">
                  {text.whitelist.emailLabel}
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="email"
                    className={`min-w-0 flex-1 ${inputClass}`}
                    placeholder={text.whitelist.emailPlaceholder}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? text.whitelist.adding : text.whitelist.add}
                  </Button>
                </div>
              </form>
            </div>

            {addMutation.error ? (
              <p className="mt-5 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {text.common.supabaseErrorPrefix} {errorMessage(addMutation.error)}
              </p>
            ) : null}

            {removeMutation.error ? (
              <p className="mt-5 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {text.common.supabaseErrorPrefix} {errorMessage(removeMutation.error)}
              </p>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-card border border-border bg-card shadow-sm">
            {selectedUsers.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">{text.whitelist.emptyUsers}</p>
            ) : (
              <ul className="divide-y divide-border">
                {selectedUsers.map((row) => {
                  const userName = row.user?.name || row.user?.email || text.common.unknownUser;
                  return (
                    <li key={`${row.course_id}:${row.user_id}`} className="flex gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{userName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.user?.email ?? row.user_id}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {text.whitelist.accessSince} {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        className="self-start"
                        disabled={removingUserId === row.user_id}
                        onClick={() => handleRemove(row)}
                      >
                        {removingUserId === row.user_id ? text.whitelist.removing : text.whitelist.remove}
                      </Button>
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
