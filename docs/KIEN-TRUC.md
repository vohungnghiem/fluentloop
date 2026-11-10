# FLUENTLOOP – KIẾN TRÚC KỸ THUẬT (đề xuất)

> Đây là đề xuất. Chưa có dòng code nào. Chỉ dựng project khi bạn nói "bắt đầu Sprint 01".

## 1. Nguyên tắc
- **Một app, không server, không DB riêng, không Docker.** `npm install && npm run dev` là chạy.
- Chạy được **offline** (PWA). Chỉ AI cần mạng.
- **Logic học là TypeScript thuần** (không phụ thuộc React), test được bằng unit test, và mọi hàm nhận `now` làm tham số.
- Nội dung là **dữ liệu**, có schema, kiểm tra lúc build.
- Dev server chạy ở **cổng 3100** (cổng 3000 đang được dùng cho việc khác).

## 2. Stack

| Phần | Chọn | Vì sao |
|---|---|---|
| Build | **Vite** + React 19 + TypeScript | Không cần SSR. Nhẹ và nhanh hơn Next.js cho app chạy hoàn toàn ở client |
| Style | Tailwind v4 + CSS variables (design tokens) | Đổi theme sáng/tối và đổi màu theo track dễ |
| Router | React Router (hoặc wouter) | Chỉ có khoảng 8 màn hình |
| Lưu trữ | **IndexedDB qua Dexie** | Thẻ và lịch sử sẽ lớn hơn giới hạn của localStorage. Truy vấn theo hạn ôn |
| SRS | `ts-fsrs` | Đã dùng ở Lingua Quest |
| Schema | `zod` | Kiểm tra nội dung, kết quả AI, file nhập |
| Giọng nói | Web Speech API (STT + TTS) | Miễn phí, không server |
| AI | Gemini / OpenRouter, BYOK, gọi từ trình duyệt | Đã kiểm tra CORS ở Lingua Quest |
| PWA | `vite-plugin-pwa` | Cài lên điện thoại, chạy offline |
| Icon | `lucide-react` | Một bộ icon đồng bộ (mục Thiết kế) |
| Font | `@fontsource-variable/be-vietnam-pro`, `@fontsource-variable/jetbrains-mono` | Tự host qua npm, dấu tiếng Việt đẹp |
| Test | Vitest + Testing Library, Playwright cho e2e | Giống Lingua Quest |

Không dùng monorepo. Một package duy nhất, chia thư mục cho rõ.

## 3. Cấu trúc thư mục (dự kiến)
```
fluentloop/
├─ content/
│  ├─ tracks/core/…           # gói nội dung chung
│  ├─ tracks/dev/…            # gói ngành phần mềm
│  └─ prompts/                # khuôn prompt để AI soạn nháp nội dung
├─ public/illustrations/      # SVG minh hoạ (mục Thiết kế)
├─ scripts/content-check.ts   # npm run content:check
├─ src/
│  ├─ core/                   # TS thuần, không React
│  │  ├─ content/             # schema zod, nạp track
│  │  ├─ srs/                 # FSRS, dạng thẻ, trần mỗi ngày
│  │  ├─ session/             # lập phiên: chọn snippet, trộn thẻ cũ, các bước
│  │  ├─ check/               # chấm bằng luật: diff từ, edit distance, cụm bắt buộc
│  │  ├─ errors/              # nhãn lỗi + luật phát hiện đơn giản
│  │  └─ progress/            # số liệu, chuỗi ngày, câu đã sở hữu
│  ├─ services/
│  │  ├─ ai/                  # gemini, openrouter, schema kết quả, lưu đệm, đếm lượt
│  │  ├─ speech/              # nhận dạng, đọc, giọng
│  │  └─ db/                  # Dexie, xuất/nhập, migrations
│  ├─ features/               # today, session, review, roleplay, capture, errors, progress, settings, onboarding
│  ├─ ui/                     # design system: Button, Card, StepBar, Diff, MicButton, …
│  ├─ copy/vi.ts              # toàn bộ chữ giao diện
│  └─ main.tsx
└─ docs/
```

## 4. Mô hình dữ liệu (IndexedDB)

Mọi bản ghi có `id` (UUID) và `updatedAt`, để sau này đồng bộ được mà không phải đổi dữ liệu.

| Bảng | Trường chính |
|---|---|
| `profile` | trackId, cefr, phútMỗiNgày, ngàyBắtĐầu, mốc (ghi âm/bài viết) |
| `settings` | ai {provider, key, mode}, giọng, tốc độ, theme, trầnThẻ |
| `cards` | sentence, cloze/chunk, vi, nguồn (`content` / `capture` / `error`), refId, dạngThẻ, fsrs{…}, nhãn[] |
| `reviews` | cardId, thờiGian, rating, dạngThẻ, đúngSai, msPhảnHồi |
| `attempts` | taskId, text/âmThanh?, feedback{corrected, natural, giảiThích[], nhãn[]}, nguồn (ai/rules) |
| `sessions` | ngày, bướcĐãXong[], phút, snippetId, trạngThái (dở/xong) |
| `unitProgress` | unitId, snippetĐãHọc[], taskĐãLàm[] |
| `captures` | text gốc, nguồn, câuĐãChọn[] |
| `aiCache` | hash(prompt), kếtQuả, thờiGian |
| `recordings` | blob âm thanh (mốc, shadowing nếu chọn lưu) |

Xuất/nhập: một file JSON (bỏ blob âm thanh, hoặc tuỳ chọn gói kèm thành `.zip`).

## 5. Lập phiên (session planner)
Đầu vào: thời điểm `now`, thẻ đến hạn, tiến độ unit, mức CEFR, số phút.
1. Lấy thẻ đến hạn, sắp theo độ cấp bách, cắt theo trần và theo số phút.
2. Chọn snippet tiếp theo của unit hiện tại. Ưu tiên snippet **chứa cụm sắp đến hạn** (interleaving).
3. Chọn 2–3 câu chính để nói theo, và một task dùng lại cụm của snippet.
4. Kết quả là một danh sách bước có thể lưu, để dừng giữa chừng rồi tiếp tục được.

Hàm thuần, có test: cùng dữ liệu và cùng `now` thì cho cùng phiên.

## 6. Chấm không cần AI (`core/check`)
- **Diff theo từ** (LCS): dùng cho nghe rồi gõ và cho nói theo (so với chữ STT nghe được).
- **Chuẩn hoá:** chữ thường, bỏ dấu câu, gộp dạng viết tắt (`I'm` = `I am`), số ↔ chữ.
- **Edit distance** cho phép sai chính tả nhẹ khi điền vào câu.
- **Cụm bắt buộc:** task khai báo các cụm phải xuất hiện (kèm biến thể).
- **Luật lỗi phổ biến cho người Việt** (chỉ là gợi ý, có thể bỏ sót): thiếu mạo từ trước danh từ đếm được số ít, he/she/it + động từ thiếu -s, `yesterday`/`last` + động từ không ở quá khứ, ...
- Câu ngoài khả năng của luật thì **so với câu mẫu và cho người học tự chấm** ("Giống ý / Khác ý").

## 7. AI
- Tách theo nhà cung cấp, giống Lingua Quest (`gemini.ts`, `openrouter.ts`, `http.ts`, `types.ts`).
- Mỗi việc một prompt và một schema kết quả: `correctWriting`, `roleplayTurn`, `explainInContext`, `taskFromCapture`.
- Chế độ: `off` / `khi luật bó tay` (mặc định) / `luôn dùng`.
- Lưu đệm theo hash. Đếm lượt mỗi ngày. Lỗi mạng hoặc hết lượt thì dùng phương án dự phòng kèm một thông báo rõ ràng.

## 8. Mang gì từ Lingua Quest sang
Đường dẫn tính từ `~/Desktop/LINGUA QUEST`. **Chép sang rồi rút gọn**, không import chéo hai dự án.

| Nguồn | Dùng cho |
|---|---|
| `packages/game-core/src/memory.ts` | Bọc FSRS, schema thẻ (bỏ phần Robo) |
| `packages/game-core/src/rules.ts` (`editDistance`, chuẩn hoá) | `core/check` |
| `apps/web/src/lib/ai/*`, `lib/ai-settings.ts`, `components/play/ai-settings-panel.tsx` | `services/ai`, màn Cài đặt |
| `apps/web/src/lib/speech/*`, `hooks/use-mic.ts`, `hooks/use-speech.ts` | `services/speech`, nút micro |
| `apps/web/src/app/voice-check` + `components/voice-check` | Trang kiểm tra micro và giọng |
| `apps/web/src/lib/practice-stats.ts` | Ý tưởng cho số liệu tiến bộ |
| `components/ui/modal.tsx`, `icons.tsx` | Tham khảo (sẽ thay icon bằng Lucide) |
| docs/SPRINT-05.md mục trạng thái micro | Bảng trạng thái của nút micro (đang nghe, bị chặn, mất mạng...) |

Không mang: three.js, R3F, diorama, characters, incident/dialogue engine, Next.js.

## 9. Khi mở cho nhiều người (sau này)
| Giai đoạn | Thay đổi | Server? |
|---|---|---|
| 1. Cá nhân | Như trên | Không |
| 2. Chia sẻ | Xuất/nhập track và dữ liệu, deploy tĩnh (Cloudflare Pages / GitHub Pages) | Không (chỉ host tĩnh) |
| 3. Nhiều người dùng | Tài khoản + đồng bộ + proxy AI có hạn mức | Có. Một dịch vụ nhỏ (PocketBase một file chạy, hoặc Supabase), quyết định lúc đó |

Vì bảng dữ liệu đã có `id` UUID và `updatedAt`, lên giai đoạn 3 không phải đổi dữ liệu.
