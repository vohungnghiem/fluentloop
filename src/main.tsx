import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { useEffect } from 'react';
import './styles.css';
import { currentTrack } from './services/content';
import { startSync } from './services/sync/sync';
import { startStudyClock } from './services/studyClock';

// Before the router: a return from Google's sign-in page puts the address back first.
startSync();
startStudyClock();

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
import { StartPage } from './features/start/StartPage';
import { PlacementPage } from './features/placement/PlacementPage';
import { SpeakPage } from './features/speak/SpeakPage';
import { TalkLogPage } from './features/speak/TalkLogPage';
import { InterviewPage } from './features/interview/InterviewPage';
import { InterviewQuestionPage } from './features/interview/InterviewQuestionPage';
import { WritingListPage } from './features/writing/WritingListPage';
import { WritingPage } from './features/writing/WritingPage';

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
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/writing" element={<WritingListPage />} />
          <Route path="/writing/:key" element={<WritingPage />} />
          <Route path="*" element={<TodayPage />} />
        </Route>
        <Route path="/session" element={<SessionPage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/capture/:id/write" element={<CaptureWritePage />} />
        <Route path="/baseline" element={<BaselinePage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/placement" element={<PlacementPage />} />
        <Route path="/roleplay/:id" element={<RoleplayPage />} />
        <Route path="/speak" element={<SpeakPage />} />
        <Route path="/speak/log" element={<TalkLogPage />} />
        <Route path="/interview/:id" element={<InterviewQuestionPage />} />
      </Routes>
      <ClockBadge />
    </BrowserRouter>
  </StrictMode>,
);
