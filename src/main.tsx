import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './styles.css';
import { currentTrack } from './services/content';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/mic-check" element={<MicCheckPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/errors" element={<ErrorsPage />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/capture/:id/write" element={<CaptureWritePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/baseline" element={<BaselinePage />} />
        <Route path="/roleplay" element={<RoleplayListPage />} />
        <Route path="/roleplay/:id" element={<RoleplayPage />} />
        <Route path="*" element={<TodayPage />} />
      </Routes>
      <ClockBadge />
    </BrowserRouter>
  </StrictMode>,
);
