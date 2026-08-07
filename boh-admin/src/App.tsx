import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/AdminLayout";
import { RequireStaff } from "@/components/RequireStaff";
import { queryClient } from "@/lib/queryClient";
import { AnnouncementsPage } from "@/pages/AnnouncementsPage";
import { ContentPage } from "@/pages/content/ContentPage";
import { InboxPage } from "@/pages/InboxPage";
import { ModerationPage } from "@/pages/ModerationPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SignInPage } from "@/pages/SignInPage";
import { WhitelistPage } from "@/pages/WhitelistPage";
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
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/content" element={<ContentPage />} />
                <Route path="/whitelist" element={<WhitelistPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/moderation" element={<ModerationPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
