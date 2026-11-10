import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { retrievability } from '../../core/srs/srs';
import { courseUnits, findChunk } from '../../services/content';
import { dayOffset, now, setDayOffset } from '../../services/clock';
import { jumpToStep, makeAllDue, seedHistory, skipToWrap, snapshot, startWithSnippet, wipeAll } from '../../services/debug';
import { Button, Card, Chip } from '../../ui/ui';
import { vi } from '../../copy/vi';
import { abandonSession } from '../../services/learning';
import { RotateCcw, Square, Trash2, Clock } from 'lucide-react';
import { saveSettings, useSettings } from '../../services/settings';
import { db } from '../../services/db';
import { micSimulation, setMicSimulation, type MicSimulation } from '../../services/speech/stt';

const MIC_MODES: Array<[MicSimulation, string]> = [
  ['real', 'Micro thật'],
  ['echo', 'Nghe đúng hết'],
  ['partial', 'Nghe sót vài từ'],
  ['silent', 'Không nghe thấy gì'],
  ['blocked', 'Bị chặn quyền'],
  ['offline', 'Mất mạng'],
  ['unsupported', 'Trình duyệt không hỗ trợ'],
];

const STATE = ['Mới', 'Đang học', 'Ôn', 'Học lại'];
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Debug: move the clock, jump to any step, seed history, and see every table. Not for learners. */
export function DebugPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(dayOffset());
  const [busy, setBusy] = useState('');
  const [mic, setMic] = useState(micSimulation());
  const settings = useSettings();
  // `offset` in deps: moving the clock must recompute what is due.
  const data = useLiveQuery(() => snapshot(), [offset]);
  const at = now();

  const run = (label: string, action: () => Promise<unknown>, then?: string) => async () => {
    setBusy(label);
    try {
      await action();
    } finally {
      setBusy('');
    }
    if (then) navigate(then);
  };
  const shift = (days: number) => {
    const next = days === 0 ? 0 : offset + days;
    setDayOffset(next);
    setOffset(next);
  };

  const active = data?.sessions.find((s) => s.status === 'active');
  const wipe = () => {
    if (confirm('Xoá toàn bộ dữ liệu học trong trình duyệt này?')) {
      setDayOffset(0);
      setOffset(0);
      void run('xoá dữ liệu', wipeAll, '/')();
    }
  };
  const snippets = courseUnits.flatMap((u) => u.snippets);

  return (
    <main className="mx-auto max-w-[960px] space-y-5 px-4 py-6 text-[15px]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Debug</h1>
        <Link to="/" className="text-primary hover:underline">← Về Hôm nay</Link>
      </header>
      {busy && <p className="text-ink-soft">Đang chạy: {busy}…</p>}

      <Card className="border-primary">
        <h2 className="font-semibold">Thao tác nhanh</h2>
        <p className="mt-1 text-ink-soft">
          {active
            ? <>Đang có phiên dở ở bước <b>{active.stepIndex + 1}/{active.plan.steps.length}</b> ({active.plan.steps.map((st) => vi.session.steps[st]).join(' → ')}){active.plan.focus ? <>, luyện lỗi <code>{active.plan.focus}</code></> : null}. Trang Hôm nay sẽ luôn mời “Học tiếp” phiên này cho tới khi bạn học xong hoặc bỏ nó.</>
            : 'Không có phiên đang dở.'}
          {offset !== 0 && <> Đồng hồ đang lệch {offset > 0 ? '+' : ''}{offset} ngày.</>}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={run('học lại phiên mới', async () => { if (active) await abandonSession(active.id, now()); }, '/session')}>
            <RotateCcw size={16} />{active ? 'Bỏ phiên dở, học phiên mới' : 'Bắt đầu phiên mới'}
          </Button>
          {active && (
            <Button onClick={run('bỏ phiên dở', () => abandonSession(active.id, now()), '/')}>
              <Square size={16} />Bỏ phiên dở, về Hôm nay
            </Button>
          )}
          {offset !== 0 && <Button onClick={() => shift(0)}><Clock size={16} />Về giờ thật</Button>}
          <Button className="!border-red-500 text-red-600" onClick={wipe}><Trash2 size={16} />Xoá hết, học lại từ đầu</Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Đồng hồ</h2>
        <p className="mt-1">
          Giờ của app: <b>{at.toLocaleString('vi-VN')}</b>{' '}
          {offset !== 0 && <Chip tone="accent">lệch {offset > 0 ? '+' : ''}{offset} ngày</Chip>}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => shift(1)}>Sang ngày mai (+1)</Button>
          <Button onClick={() => shift(3)}>+3 ngày</Button>
          <Button onClick={() => shift(7)}>+7 ngày</Button>
          <Button onClick={() => shift(-1)}>−1 ngày</Button>
          <Button onClick={() => shift(0)} disabled={offset === 0}>Về giờ thật</Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Micro (giả lập)</h2>
        <p className="mt-1 text-sm text-ink-soft">Xem bước Nói theo và trang kiểm tra micro ở mọi trạng thái mà không cần micro thật. Loa vẫn dùng giọng thật của máy.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MIC_MODES.map(([mode, label]) => (
            <Button key={mode} variant={mic === mode ? 'primary' : 'secondary'} onClick={() => { setMicSimulation(mode); setMic(mode); }}>
              {label}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">AI (giả lập)</h2>
        <p className="mt-1 text-sm text-ink-soft">AI giả lập = luật + câu mẫu làm “cách nói tự nhiên”, không gọi mạng, không cần key. Đang dùng: <b>{settings.aiProvider}</b>.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant={settings.aiProvider === 'fake' ? 'primary' : 'secondary'} onClick={() => saveSettings({ aiProvider: 'fake' })}>Bật AI giả lập</Button>
          <Button onClick={() => saveSettings({ aiProvider: 'none' })} disabled={settings.aiProvider !== 'fake'}>Tắt AI giả lập</Button>
          <Button onClick={run('xoá lưu đệm AI', async () => { await db.aiCache.clear(); await db.aiUsage.clear(); })}>Xoá lưu đệm + đếm lượt AI</Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Phiên học</h2>
        {active ? (
          <>
            <p className="mt-1 text-ink-soft">
              Đang dở: đoạn <code>{active.plan.snippetId}</code>, {active.plan.reviewCardIds.length} thẻ ôn, đã ôn {active.reviewedIds.length}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {active.plan.steps.map((step, i) => (
                <Button key={step} variant={i === active.stepIndex ? 'primary' : 'secondary'} onClick={run('nhảy bước', () => jumpToStep(i), '/session')}>
                  {i + 1}. {step}
                </Button>
              ))}
              <Button onClick={run('tới Chốt', skipToWrap, '/session')}>Tới Chốt</Button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-ink-soft">Không có phiên đang dở. Bấm một đoạn bên dưới để học lại đúng đoạn đó.</p>
        )}
        <p className="mt-4 text-sm text-ink-soft">Học lại một đoạn cụ thể (tự bỏ phiên đang dở):</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {snippets.map((s) => (
            <Button key={s.id} onClick={run('bắt đầu đoạn', () => startWithSnippet(s.id), '/session')}>
              {s.titleVi}
              {data?.reads.some((r) => r.snippetId === s.id) ? ' ✓' : ''}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Dữ liệu</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={run('tạo lịch sử 3 ngày', () => seedHistory(3))}>Giả lập đã học 3 ngày</Button>
          <Button onClick={run('tạo lịch sử 6 ngày', () => seedHistory(6))}>Giả lập đã học 6 ngày</Button>
          <Button onClick={run('cho thẻ đến hạn', makeAllDue)}>Cho mọi thẻ đến hạn ngay</Button>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          “Giả lập” xoá dữ liệu cũ rồi chạy đúng logic thật cho từng ngày trước hôm nay (ôn, đọc, viết).
        </p>
      </Card>

      {data && (
        <>
          <Card>
            <h2 className="font-semibold">Thẻ ({data.cards.length}) · đến hạn hôm nay: {data.queue.length}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="py-1 pr-3">Cụm</th>
                    <th className="pr-3">Trạng thái</th>
                    <th className="pr-3">Hạn ôn</th>
                    <th className="pr-3">Lần ôn</th>
                    <th className="pr-3">Quên</th>
                    <th className="pr-3">Ổn định (ngày)</th>
                    <th>Khả năng nhớ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.cards]
                    .sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due))
                    .map((card) => {
                      const due = data.queue.some((q) => q.id === card.id);
                      return (
                        <tr key={card.id} className="border-t border-line">
                          <td className="py-1 pr-3 font-medium">{card.chunkId ? findChunk(card.chunkId)?.en ?? card.chunkId : `✎ ${card.wrongSentence}`}</td>
                          <td className="pr-3">{STATE[card.fsrs.state]}</td>
                          <td className="pr-3">{due ? <Chip tone="accent">{fmt(card.fsrs.due)}</Chip> : fmt(card.fsrs.due)}</td>
                          <td className="pr-3">{card.fsrs.reps}</td>
                          <td className="pr-3">{card.fsrs.lapses}</td>
                          <td className="pr-3">{card.fsrs.stability.toFixed(1)}</td>
                          <td>{Math.round(retrievability(card.fsrs, at) * 100)}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold">Phiên ({data.sessions.length})</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {data.sessions.map((s) => (
                <li key={s.id}>
                  <b>{s.day}</b> · {s.status === 'done' ? 'xong' : `dở ở bước ${s.stepIndex + 1}/${s.plan.steps.length}`} ·{' '}
                  {s.plan.steps.join(' → ')} · đoạn <code>{s.plan.snippetId}</code> · ôn {s.stats.reviewed} (nhớ {s.stats.remembered}) · cụm mới{' '}
                  {s.stats.newCards} · viết {s.stats.written}
                  {s.stats.skipped.length > 0 && ` · bỏ qua: ${s.stats.skipped.join(', ')}`}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-semibold">Bài viết ({data.attempts.length})</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {[...data.attempts].reverse().map((a) => (
                <li key={a.id}>
                  <span className="text-ink-soft">
                    {fmt(a.at)} · {a.taskId} · {a.selfCheck ?? 'chưa tự chấm'}
                  </span>
                  <div lang="en">{a.text}</div>
                  {a.missingRequired.length > 0 && <div className="text-accent-ink">thiếu: {a.missingRequired.join(', ')}</div>}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}
