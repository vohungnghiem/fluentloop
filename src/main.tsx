import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { useEffect } from 'react';
import './styles.css';
import { currentTrack } from './services/content';
import { startSync } from './services/sync/sync';

// Before the router: a return from Google's sign-in page puts the address back first.
startSync();

// Each industry has its own colour for labels and illustrations (lighter on the dark theme).
document.head.insertAdjacentHTML(
  'beforeend',
  `<style>:root{--track:${currentTrack.color}}@media (prefers-color-scheme: dark){:root{--track:color-mix(in srgb, ${currentTrack.color} 55%, white)}}</style>`,
);
import { TodayPage } from './features/today/TodayPage';
import { SessionPage } from './features/session/SessionPage';
import { DebugPage } from './features/debug/DebugPage';
import { MicCheckPage } from './features/mic-check/MicCheckPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ErrorsPage } from './features/errors/ErrorsPage';
import { CapturePage } from './features/capture/CapturePage';
import { CaptureWritePage } from './features/capture/CaptureWritePage';
import { ProgressPage } from './features/progress/ProgressPage';
import { BaselinePage } from './features/progress/BaselinePage';
import { RoleplayListPage } from './features/roleplay/RoleplayListPage';
import { RoleplayPage } from './features/roleplay/RoleplayPage';
import { ClockBadge } from './ui/ClockBadge';
import { AppShell } from './ui/shell';
import { PathPage } from './features/lesson/PathPage';
import { LessonPage } from './features/lesson/LessonPage';

/** A new screen starts at its top, not where the last one was scrolled to. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ScrollToTop />
      <Routes>
        {/* Browsing screens share the tab bar; focused flows (a session, a conversation, a task) do not. */}
        <Route element={<AppShell />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/mic-check" element={<MicCheckPage />} />
          <Route path="/errors" element={<ErrorsPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/roleplay" element={<RoleplayListPage />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="*" element={<TodayPage />} />
        </Route>
        <Route path="/session" element={<SessionPage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/capture/:id/write" element={<CaptureWritePage />} />
        <Route path="/baseline" element={<BaselinePage />} />
        <Route path="/roleplay/:id" element={<RoleplayPage />} />
      </Routes>
      <ClockBadge />
    </BrowserRouter>
  </StrictMode>,
);
