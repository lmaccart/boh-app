-- Business of Happiness — table grants for `service_role`
-- Edge functions (reach-out-email, notify) connect with the service role key,
-- which bypasses RLS but still requires the coarser table-level privilege.
-- That grant was never made, so every query from these functions failed with
-- "permission denied for table ..." and was silently swallowed by their
-- early-return-on-error logic. Grants below cover exactly the read-only
-- queries these functions run.

grant select on public.users to service_role;
grant select on public.course_whitelist to service_role;
grant select on public.push_tokens to service_role;
