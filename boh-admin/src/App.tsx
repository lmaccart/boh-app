import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/AdminLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RequireStaff } from "@/components/RequireStaff";
import { text } from "@/constants/text";
import { queryClient } from "@/lib/queryClient";
import { SignInPage } from "@/pages/SignInPage";
import { AuthProvider } from "@/providers/AuthProvider";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route element={<RequireStaff />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="/inbox" replace />} />
                <Route path="/inbox" element={<PlaceholderPage title={text.nav.inbox} />} />
                <Route path="/content" element={<PlaceholderPage title={text.nav.content} />} />
                <Route
                  path="/whitelist"
                  element={<PlaceholderPage title={text.nav.whitelist} />}
                />
                <Route
                  path="/announcements"
                  element={<PlaceholderPage title={text.nav.announcements} />}
                />
                <Route
                  path="/moderation"
                  element={<PlaceholderPage title={text.nav.moderation} />}
                />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
