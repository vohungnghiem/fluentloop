import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './styles.css';
import { TodayPage } from './features/today/TodayPage';
import { SessionPage } from './features/session/SessionPage';
import { DebugPage } from './features/debug/DebugPage';
import { MicCheckPage } from './features/mic-check/MicCheckPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ErrorsPage } from './features/errors/ErrorsPage';
import { CapturePage } from './features/capture/CapturePage';
import { CaptureWritePage } from './features/capture/CaptureWritePage';
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
        <Route path="*" element={<TodayPage />} />
      </Routes>
      <ClockBadge />
    </BrowserRouter>
  </StrictMode>,
);
