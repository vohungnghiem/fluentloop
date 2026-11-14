# FLUENTLOOP – KIẾN TRÚC KỸ THUẬT

> Mô tả code hiện có (sau Sprint 09). Phần "sắp làm" ghi rõ theo sprint.

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
| SRS | `ts-fsrs` | Thuật toán ôn hiện đại, có sẵn |
| Schema | `zod` | Kiểm tra nội dung, kết quả AI, file nhập |
| Giọng nói | Web Speech API (STT + TTS) | Miễn phí, không server |
| AI | Gemini / OpenRouter / OpenAI / tương thích OpenAI, BYOK, gọi từ trình duyệt | Không cần server |
| PWA | `vite-plugin-pwa` | Cài lên điện thoại, chạy offline |
| Icon | `lucide-react` | Một bộ icon đồng bộ (mục Thiết kế) |
| Font | `@fontsource-variable/be-vietnam-pro`, `@fontsource-variable/jetbrains-mono` | Tự host qua npm, dấu tiếng Việt đẹp |
| Test | Vitest + Testing Library, Playwright cho e2e | |

Không dùng monorepo. Một package duy nhất, chia thư mục cho rõ.

## 3. Cấu trúc thư mục
```
fluentloop/
├─ content/
│  ├─ tracks/core/…           # gói Nền (A2→B1), học trước khi vào ngành
│  ├─ tracks/dev/…            # gói ngành phần mềm
│  └─ prompts/                # unit.md: khuôn soạn nháp; review.md: khuôn kiểm chéo
├─ public/illustrations/      # SVG minh hoạ (mục Thiết kế)
├─ scripts/content-check.ts   # npm run content:check
├─ scripts/content-review.ts  # npm run -s content:review -- <unit>: prompt kiểm chéo
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

## 4. Mô hình dữ liệu (IndexedDB, `src/services/db.ts`)

Mọi bản ghi có `id` và `updatedAt`, để sau này đồng bộ được.

| Bảng | Nội dung |
|---|---|
| `cards` / `reviews` | Thẻ ôn (nội dung, lỗi, bỏ túi) + FSRS, lịch sử ôn |
| `sessions` | Kế hoạch phiên, bước hiện tại, thống kê |
| `attempts` | Bài viết cho task: text, cụm đã dùng/thiếu, tự chấm, nguồn |
| `mistakes` | Lỗi đã chọn thành thẻ, có nhãn |
| `reads`, `captures`, `baselines`, `roleplays` | Bài đã đọc, bỏ túi, bài mốc, hội thoại |
| `aiCache`, `aiUsage` | Lưu đệm kết quả AI, đếm lượt mỗi ngày |
| `plans` | Kế hoạch 16 tuần: một dòng `main` (ngày bắt đầu, số phút mỗi ngày, trình độ, đã qua màn Bắt đầu chưa) |
| `placements` | Mỗi lần làm bài xếp mức: trình độ, đúng/tổng theo kỹ năng, đáp án đã chọn |
| `studyTime` | Số giây dùng app thật, mỗi máy một dòng mỗi ngày (`<máy>:<ngày>`), nên đồng bộ không cộng trùng |
| `meta` | Chỉ của máy này, không đồng bộ: `resetAt` là lần xoá dữ liệu gần nhất máy này biết |
| `studyLog` | Giờ học ngoài app người học tự ghi. Bỏ thì đánh dấu `deleted` để máy kia bỏ theo |

**Sắp làm:**
- Sprint 10 (xong): `attempts` có `revisions` (các lần viết trước) và `missingPoints`. Lỗi của mọi lần viết đều vào `mistakes`. Câu nâng cấp được chọn thành thẻ sửa câu, nhãn `naturalness`.
- Sprint 11 (xong): bảng `drafts` (`src/ui/useDraft.ts`) lưu chữ đang gõ sau 300ms và khi rời trang. Áp dụng cho bước Dùng (cả gợi ý, các lần viết, nhận xét), Bỏ túi, Hội thoại, bài mốc. Không đưa vào sao lưu. `sessions.reachedIndex` là bước xa nhất đã tới, thanh bước quay lại được tới đó (`goToStep`).
- Sprint 13 (xong): đồng bộ qua Google Drive, xem mục 7b. Nháp bị xoá được giữ thành dấu `deleted` trong 30 ngày.
- Sprint 14 (xong): kế hoạch 16 tuần, xem mục 5b. Bốn bảng `plans`, `placements`, `studyTime`, `studyLog` có trong đồng bộ (`SYNC_KEYS`) và sao lưu.
- Sprint 18: màn lịch sử đọc từ `attempts`, đồng bộ và xuất/nhập gồm cả phần này.

## 5. Lập phiên (session planner)
Đầu vào: thời điểm `now`, thẻ đến hạn, tiến độ unit, mức CEFR, số phút.
1. Lấy thẻ đến hạn, sắp theo độ cấp bách, cắt theo trần và theo số phút.
2. Chọn snippet tiếp theo của unit hiện tại. Ưu tiên snippet **chứa cụm sắp đến hạn** (interleaving).
3. Chọn 2–3 câu chính để nói theo, và một task dùng lại cụm của snippet.
4. Kết quả là một danh sách bước có thể lưu, để dừng giữa chừng rồi tiếp tục được.

Hàm thuần, có test: cùng dữ liệu và cùng `now` thì cho cùng phiên.

## 5b. Kế hoạch 16 tuần (Sprint 14)
- **`core/plan/plan.ts` (TS thuần, có test):** `planWeek` tính tuần thứ mấy, tháng (4 tuần một tháng: Nền → Nền + công việc → Nói dài → Phỏng vấn), ngày kết thúc. Tuần làm mốc là 1, 5, 9, 13, 16. `checkpointDue` báo mốc đến hạn khi chưa có mốc nào từ ngày đầu của tuần mốc gần nhất. `minutesByDay` cộng phút mỗi ngày: phần trong app lấy số lớn hơn giữa thời gian app đếm được và độ dài các phiên (vì ngày trước Sprint 14 chưa đếm), cộng thêm giờ ghi ngoài app.
- **Bài xếp mức (`core/plan/placement.ts`, nội dung ở `content/placement.json`, `content:check` kiểm):** 20 câu, mỗi mức A1–B2 có 5 câu (2 nghe bằng giọng đọc của máy, 1 đọc, 2 ngữ pháp/từ vựng). Làm từ dễ đến khó. Một mức đúng dưới 40% thì dừng. Trình độ là mức cao nhất đúng từ 60%, với mọi mức dưới cũng đạt. Không đạt A1 thì là A0. "Không biết" tính là sai. Máy không có giọng đọc thì bỏ phần nghe. Bài làm dở lưu nháp (`drafts`, khoá `placement`).
- **Đếm giờ (`services/studyClock.ts`):** cứ 5 giây cộng thêm nếu tab đang hiện và người học có thao tác trong 90 giây gần nhất (hoặc app đang đọc to). Không đếm ở Cài đặt và Debug. Ghi vào IndexedDB 2 phút một lần và khi ẩn tab, để không đánh thức đồng bộ quá thường.
- **Màn Bắt đầu (`/start`):** người mới (chưa có phiên nào và chưa qua màn này) được chuyển tới đây từ Hôm nay. Gồm chào → ngành → số phút → xếp mức → mốc → AI → xong, bước nào cũng để sau được. Bước đang làm lưu nháp (`start`). Người học cũ chưa có kế hoạch thấy thẻ mời ở Hôm nay, không bị chuyển.
- **Số phút mỗi ngày** từ 30 trở lên thì phiên có 20 thẻ ôn thay vì 10.


## 5c. Gói Nền và hỗ trợ theo mức (Sprint 15)
- **Gói Nền:** track có `"foundation": true` (`core`). Bài xếp mức ra A0–A2 (`needsFoundation`) thì học gói này trước. Ở màn Bắt đầu, việc chuyển gói xảy ra khi bấm "Vào bài đầu tiên" (tải lại app thẳng vào `/session`). Không chuyển ngay sau bài xếp mức, vì nháp của màn Bắt đầu lưu có độ trễ. Làm lại bài xếp mức ở `/placement` thì chuyển ngay. Cài đặt lưu thêm `nextTrackId` là ngành đã chọn. Học hết gói Nền thì Hôm nay và Lộ trình hiện `FoundationDone` (nút "Sang gói …"). Bước "ngành" ở màn Bắt đầu chỉ liệt kê gói ngành; khi đang ở gói Nền, chọn ngành chỉ đổi `nextTrackId`. Các hàm nằm ở `services/content.ts`: `chooseTrack`, `chooseIndustry`, `chosenIndustry`.
- **Hỗ trợ theo mức (`supportFor` trong `services/plan.ts`, hook `useSupport`):** dưới B1, hoặc đang ở gói Nền mà chưa xếp mức, thì bản dịch mở sẵn ở `SnippetReader` và gợi ý bậc 1 (từ nội dung, không cần AI) mở sẵn khi bắt đầu viết. Prompt AI (`correct`, `hint`, `roleplay`) thêm `levelBrief` (`services/ai/level.ts`): tiếng Việt đơn giản, câu ngắn, mỗi lần nâng cấp chỉ lên một bậc nhỏ. Mức được đọc lúc gọi AI và nằm trong prompt, nên cache tự tách theo mức.
- **Schema unit thêm:** `pattern` (khung mẫu câu, hiện ở bước Nạp và trang bài bằng `PatternCard`), `sounds` (âm cần chú ý; bước Nói theo hiện những âm có trong câu đang nói, bằng `SoundTips`), `review` (ai kiểm chéo, ngày nào). `cefr` có thêm `A1`.
- **`content:check` theo mức (`levelProblems`, `contentWarnings` trong `core/content/schema.ts`):** unit A1/A2 không được có câu dài quá 10/14 từ (bài đọc, ví dụ của cụm, câu mẫu, hội thoại, mẫu câu). Mọi task phải có `points` và đủ 2 `hints`. Unit gói Nền phải có `pattern`. Thiếu `review` ở gói Nền và âm không có trong bài chỉ là cảnh báo, không chặn build.
- **Quy trình soạn:** `content/prompts/unit.md` để soạn nháp → `content:check` → `npm run -s content:review -- <unit>` in prompt kiểm chéo → dán vào model khác → sửa → ghi `review`. App không gọi AI để soạn nội dung.

## 5d. Luyện nói (Sprint 16)
- **Bảng `talks`** (đồng bộ, sao lưu): một lần nói, `kind` là `talk` (nói liền), `conversation` (hội thoại) hoặc `real` (ghi lại buổi nói thật). Gồm đề, số giây, chữ máy nghe được, từ/phút, số lần ngập ngừng, tiếng đệm, bản ghi (`audio`), số lượt nói, câu muốn nói. Bản ghi đi thành file riêng khi đồng bộ, như bài mốc: `AUDIO_TABLES` trong `services/sync/sync.ts`.
- **`core/speech/fluency.ts` (TS thuần, có test):** đếm từ (bỏ tiếng đệm "uh, um"), tìm khoảng lặng từ độ to của micro (mỗi 0,1 giây; ngưỡng tính theo chính bản ghi đó; lặng từ 1 giây giữa hai đoạn nói là một lần ngập ngừng). Từ/phút tính trên thời gian thật sự nói, không tính được nếu nói dưới 20 giây. `weekSpeed` so 7 ngày gần nhất với 7 ngày trước đó.
- **Ghi âm (`services/speech/record.ts`):** `startRecording(onLevel)` đo độ to bằng Web Audio, trả kèm `levels`. **Nghe dài (`listenLong` trong `stt.ts`):** nhận giọng chế độ liên tục, tự bật lại khi trình duyệt dừng vì lặng, cho đến khi bấm Dừng. Có chế độ giả lập (`/debug`). Nhận giọng được bật ngay trong lúc bấm (Safari đòi vậy), sau đó mới mở máy ghi âm. Một trong hai không chạy được thì vẫn dùng cái còn lại.
- **Nhận xét bài nói:** dùng lại `WritingTask`, truyền `initialText` là chữ đã nghe và sửa. Lượt viết được lưu với `snippetId` là `talk:<id>`.
- **Hội thoại:** `roleplayTurn` trả thêm `replyVi`. Micro (`MicButton`) gửi ngay điều nghe được. Kết thúc thì lưu một dòng `talks`.
- **Sau buổi nói:** `saveRealTalk` lưu dòng `talks`, cộng phút vào `studyLog` (loại `speak`), và tạo thẻ điền câu cho mỗi câu có tiếng Anh (`unitId: 'talk'`, đáp án là cả câu, gợi ý là câu tiếng Việt). `services/ai/phrase.ts` gợi ý câu tiếng Anh.

## 5e. Gói Công việc và Phỏng vấn (Sprint 17)
- **Unit dùng chung giữa các gói:** `track.units` có thể liệt kê unit của gói khác. `dev` và `hospitality` mở đầu bằng 5 unit của `work`. `courseUnits` lấy unit theo id trong toàn thư viện, nên không phải sửa code.
- **Kịch bản có câu hỏi mở:** `scriptNode.any` là node tiếp theo cho mọi câu trả lời từ 3 từ trở lên (`nextNode` trong `core/roleplay/script.ts`). Phỏng vấn thử dùng cách này khi không có AI.
- **Nội dung phỏng vấn:** `content/interview.json`, schema ở `core/content/interview.ts`, `content:check` có kiểm. Gồm câu hỏi (en, vi, mẹo, khung trả lời, ý cần có, 2 gợi ý, câu mẫu) và tình huống `interview-mock`. `interviewTask` biến một câu hỏi thành task (câu trả lời của người học là câu mẫu đầu tiên), dùng cho kiểm tra (`WritingTask`) và Nói liền (`/speak?interview=<id>`).
- **Dữ liệu:** hồ sơ (CV) ở `PlanRow.profile`. Bảng `answers` (khoá `questionId`, đồng bộ, sao lưu) lưu câu trả lời và id các thẻ. `saveAnswer` tạo mỗi câu một thẻ điền câu (`unitId: 'interview'`); câu không đổi thì giữ thẻ cũ cùng tiến độ ôn. `services/ai/interview.ts` soạn nháp từ CV, không bịa: thiếu thông tin thì để `[ … ]`. Phỏng vấn thử với AI thì ghép CV vào `persona`.
- `WritingTask.onDone(text)` trả về phiên bản cuối đã kiểm tra.
## 6. Chấm không cần AI (`core/check`)
- **Diff theo từ** (LCS): dùng cho nghe rồi gõ và cho nói theo (so với chữ STT nghe được).
- **Chuẩn hoá:** chữ thường, bỏ dấu câu, gộp dạng viết tắt (`I'm` = `I am`), số ↔ chữ.
- **Edit distance** cho phép sai chính tả nhẹ khi điền vào câu.
- **Cụm bắt buộc:** task khai báo các cụm phải xuất hiện (kèm biến thể).
- **Luật lỗi phổ biến cho người Việt** (chỉ là gợi ý, có thể bỏ sót): thiếu mạo từ trước danh từ đếm được số ít, he/she/it + động từ thiếu -s, `yesterday`/`last` + động từ không ở quá khứ, ...
- Câu ngoài khả năng của luật thì **so với câu mẫu và cho người học tự chấm** ("Giống ý / Khác ý").

## 7. AI
- `services/ai/providers.ts` gom các nhà cung cấp. Mỗi việc một prompt và một schema: `correct.ts`, `roleplay.ts`, `capture.ts`.
- `correct.ts` là **người kèm học**: đầu vào gồm đề, ý cần có (`task.points`), cụm và câu mẫu; đầu ra gồm `coverage`, `mistakes`, `upgrades`, `praiseVi`. `hint.ts` cho gợi ý 3 bậc (AI hoặc `task.hints`). Luật và AI được gộp ở `core/check/feedback.ts` (`buildFeedback`) trước khi tới UI.
- Chế độ: `off` / `khi luật bó tay` (mặc định) / `luôn dùng`.
- Lưu đệm theo hash. Đếm lượt mỗi ngày. Lỗi mạng hoặc hết lượt thì dùng phương án dự phòng kèm một thông báo rõ ràng.

## 7b. Đồng bộ nhiều máy (Sprint 13, xong)

Dùng cho một người học trên nhiều thiết bị. Không có server riêng, app vẫn là trang tĩnh.

- **Cách mặc định, nhanh nhất: token GitHub** (`services/sync/github.ts`, `gistStore`). Người học bấm link tạo token đã điền sẵn quyền `gist`, dán vào Cài đặt. Dữ liệu nằm trong một **gist bí mật** ("FluentLoop sync"), ghi âm là file text dạng data URL. Token nằm trong localStorage như key AI, không hết hạn nếu chọn No expiration. Điện thoại nhận token qua mã QR (`#sync=<token>`, đọc xong xoá khỏi thanh địa chỉ, dùng chung `ui/QrReveal` với QR chuyển key AI). GitHub lưu đệm phản hồi 60 giây nên mọi lần gọi dùng `cache: 'no-store'`. Token sai hoặc bị thu hồi thì báo ở Hôm nay và trên `SyncBadge`, dẫn về Cài đặt để dán token mới.
- **Cách tuỳ chọn: Google Drive**, chỉ hiện khi bản build có `VITE_GOOGLE_CLIENT_ID`. Nơi lưu: thư mục `appDataFolder` trên Google Drive của người học (scope `drive.appdata`: app chỉ thấy file của chính nó, người học không thấy trong Drive, không đụng được file khác). Một file `fluentloop-sync.json` cùng định dạng với file sao lưu nhưng không có ghi âm. Mỗi bản ghi âm là một file riêng `audio-<id>`, chỉ tải lên hoặc tải về khi chưa có.
- **Đăng nhập (`services/sync/auth.ts`):** OAuth luồng token theo kiểu **chuyển trang** (không popup, không thư viện của Google): sang Google, quay về gốc app với token trong `#fragment`. Màn đang dở đi theo `state` và được trả lại trước khi router chạy. Có `nonce` chống token lạ. Client ID là thông tin công khai, build vào app qua `VITE_GOOGLE_CLIENT_ID`. Token sống khoảng 1 giờ, lưu trong localStorage.
  - Hết hạn: khi mở app, hoặc quay lại app sau hơn 15 phút, app tự sang Google với `prompt=none` và quay về ngay nếu trình duyệt còn đăng nhập Google. Mỗi tab thử tối đa một lần mỗi 10 phút. Không được thì hiện "Đăng nhập lại" ở Hôm nay và trên `SyncBadge`, không chặn việc học.
  - Đang học dở mà token hết hạn thì không chuyển trang, đồng bộ đợi tới lần mở sau.
  - Chế độ **Drive giả** (trang `/debug`): đăng nhập không qua Google, "Drive" nằm trong localStorage, dùng để thử toàn bộ luồng.
- **Gộp (`src/core/sync/merge.ts`, TS thuần, có test):** theo từng bảng, theo `id`.
  - Bảng có `updatedAt` (thẻ, phiên, bài đã đọc, hội thoại, nháp…): bản sửa sau thắng.
  - Bảng chỉ thêm vào (`reviews`, `attempts`, `mistakes`, `captures`, `baselines`): gộp hợp của hai bên.
  - `aiUsage`: lấy số lớn hơn mỗi ngày.
  - Xoá (hiện chỉ có nháp): ghi một bản "đã xoá" kèm `updatedAt` thay vì xoá hẳn, để máy kia biết mà xoá theo.
  - Hai phiên đang mở cùng một ngày ở hai máy: phiên sửa sau là phiên đang học, phiên kia giữ lại để tính thống kê.
- **Vòng đồng bộ (`services/sync/sync.ts`, `store.ts`):** kéo về → gộp → ghi vào IndexedDB → nếu bên Drive thiếu gì thì đẩy lên. Trước khi đẩy, kiểm `version` của file trên Drive. Nếu máy khác vừa đẩy thì làm lại từ đầu để gộp, không ghi đè. Hook của Dexie trên các bảng báo có thay đổi: đồng bộ sau 4 giây yên, hoặc tối đa 20 giây khi đang gõ liên tục. Cũng chạy khi mở app, khi rời tab, khi quay lại, khi có mạng lại, và 5 phút một lần khi đang mở. Dữ liệu do chính vòng đồng bộ ghi thì không kích hoạt vòng mới.
- **Xoá dữ liệu học (Cài đặt, `services/reset.ts`):** xoá mọi bảng đồng bộ và `aiCache`, giữ key AI, cài đặt và kết nối đồng bộ, ghi `meta.resetAt`. File đồng bộ mang `resetAt`. Khi đồng bộ: bản chung có `resetAt` mới hơn máy này thì máy này xoá các dòng viết trước mốc đó (`rowsBefore`, theo `updatedAt`/`at`/`createdAt`), dòng tạo sau mốc vẫn giữ. Máy này có `resetAt` mới hơn thì bỏ các dòng cũ của bản chung và ghi lại bản chung. Nhờ vậy máy khác không đẩy dữ liệu cũ quay về. Có test hai máy với Drive giả.
- **Lần đầu đăng nhập trên một máy:** gộp dữ liệu sẵn có của máy đó vào, không xoá gì.
- **Không đồng bộ:** key AI và cài đặt AI (vẫn chuyển bằng QR), `aiCache`.
- **Nhập file sao lưu** dùng chung hàm gộp, không xoá rồi ghi đè nữa.
- **Nháp sống (`ui/useDraft`):** nháp theo dõi IndexedDB. Có bản mới hơn từ máy khác thì màn đang mở lấy bản đó (`remote` tăng). Nội dung giống hệt thì không ghi lại, nên hai máy cùng mở một màn không ghi qua lại liên tục.
- **Kiểm thử:** hàm gộp có unit test. Vòng đồng bộ test với một "Drive giả" chạy trong bộ nhớ, giả lập hai máy. Đăng nhập Google thật và iOS PWA để người dùng thử.

## 8. Khi mở cho nhiều người (sau này)
| Giai đoạn | Thay đổi | Server? |
|---|---|---|
| 1. Cá nhân | Như trên | Không |
| 2. Chia sẻ | Xuất/nhập track và dữ liệu, deploy tĩnh (Cloudflare Pages / GitHub Pages) | Không (chỉ host tĩnh) |
| 3. Nhiều người dùng | Tài khoản + đồng bộ (đổi Drive sang Firebase hoặc tương tự, giữ hàm gộp) + proxy AI có hạn mức | Có. Một dịch vụ nhỏ (PocketBase một file chạy, hoặc Supabase), quyết định lúc đó |

Vì bảng dữ liệu đã có `id` UUID và `updatedAt`, lên giai đoạn 3 không phải đổi dữ liệu.
