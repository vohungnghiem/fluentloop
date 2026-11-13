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

**Sắp làm:**
- Sprint 10 (xong): `attempts` có `revisions` (các lần viết trước) và `missingPoints`. Lỗi của mọi lần viết đều vào `mistakes`. Câu nâng cấp được chọn thành thẻ sửa câu, nhãn `naturalness`.
- Sprint 11 (xong): bảng `drafts` (`src/ui/useDraft.ts`) lưu chữ đang gõ sau 300ms và khi rời trang. Áp dụng cho bước Dùng (cả gợi ý, các lần viết, nhận xét), Bỏ túi, Hội thoại, bài mốc. Không đưa vào sao lưu. `sessions.reachedIndex` là bước xa nhất đã tới, thanh bước quay lại được tới đó (`goToStep`).
- Sprint 13 (xong): đồng bộ qua Google Drive, xem mục 7b. Nháp bị xoá được giữ thành dấu `deleted` trong 30 ngày.
- Sprint 14: màn lịch sử đọc từ `attempts`, đồng bộ và xuất/nhập gồm cả phần này.

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
