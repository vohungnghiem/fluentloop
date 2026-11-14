# FLUENTLOOP – PHÁC THẢO SẢN PHẨM

**Phiên bản:** 0.3 (2026-11-14). Thêm mục tiêu 16 tuần, người học bắt đầu từ A2, các gói nội dung Nền/Công việc/Phỏng vấn, nói với AI bằng giọng, dùng được cho bạn bè.
**Phiên bản 0.2** (2026-11-11): viết lại cho đúng mục đích là **app học**, không phải game.
**Nhân sự:** 1 người · **Nền tảng:** web (PWA), ưu tiên mobile, desktop dùng tốt bằng bàn phím

> **Một câu:** học tiếng Anh **dùng được trong công việc** theo một kế hoạch 16 tuần, mỗi ngày 15–60 phút trong app. App là **người kèm học**: dạy, gợi ý khi bí, chỉ ra cách nói hay hơn, rồi biến lỗi và câu hay của bạn thành bài ôn ngày mai.

![Màn hình Hôm nay](mockups/01-today.svg)

---

## 1. Mục đích và điều KHÔNG làm

**Mục đích duy nhất:** người học **viết và nói được** câu tiếng Anh dùng trong công việc, ngày càng tự nhiên hơn, và **thấy được** mình tiến bộ.

Hệ quả cho mọi quyết định:
- Người dùng **đang học, chưa biết**. App không được "chấm đúng rồi cho qua". Câu đúng vẫn phải có thứ để học thêm (mục 4).
- Mỗi màn hỏi một câu: "màn này giúp người học nói/viết được gì?" Không trả lời được thì bỏ.
- Đã bỏ hẳn: thế giới 3D, NPC, cốt truyện, quest, XP, tim, bảng xếp hạng. Những thứ này không đưa trở lại.
- Tạo động lực bằng **tiến bộ thật** (lỗi giảm, câu đã thuộc, bài viết lần sau tốt hơn lần trước), không bằng điểm ảo.

### 1.1 Mục tiêu 16 tuần (từ 2026-11)
- **Điểm xuất phát:** khoảng A2 (TOEIC 350 cách đây 10 năm, nghe và nói có thể đã tụt).
- **Đích sau 16 tuần:** **B1 chắc**, tương đương khoảng TOEIC 600–700. Tự giới thiệu, kể việc mình đã làm, họp đơn giản, viết email, trả lời phỏng vấn cơ bản mà không phải dịch trong đầu. "Thành thạo" (B2 trở lên) là chặng tiếp theo, không hứa trong 16 tuần.
- **Khối lượng:** khoảng 3 giờ/ngày, trong đó app chiếm 60–90 phút, phần còn lại là nghe nguồn thật và nói. Tổng cộng khoảng 350–400 giờ.
- **Lý do học:** có kỹ năng mềm mang theo được. Vẫn trụ lại IT, nhưng mở đường sang các vai cần tiếng Anh (BA, PO/PM, QA, hỗ trợ kỹ thuật, pre-sales, làm cầu nối với khách nước ngoài).

| Tháng | Trọng tâm | Xong khi |
|---|---|---|
| 1 | **Nền:** phát âm, nghe, các thì cơ bản theo mẫu câu, khoảng 600 cụm thông dụng | Nghe hiểu hội thoại chậm, nói được 5–6 câu về bản thân |
| 2 | **Nền + công việc:** email, standup, hỏi lại khi không hiểu, mô tả việc mình làm | Viết email ngắn không cần dịch, họp standup được |
| 3 | **Nói dài:** giải thích một vấn đề, kể một dự án 1–2 phút, góp ý | Nói liền 90 giây, ít ngập ngừng hơn lần đo tuần 1 |
| 4 | **Phỏng vấn:** câu trả lời của chính mình (STAR), phỏng vấn thử với AI, bài mốc cuối | Phỏng vấn thử 20 phút; so bài mốc tuần 1 với tuần 16 |

Một ngày mẫu: app (ôn + một phiên học) 60 phút, nghe nguồn thật có phụ đề 45 phút, nói với AI 30 phút, đọc hoặc viết thêm 30 phút. Mỗi tuần 1–2 lần nói với người thật ở chỗ miễn phí (câu lạc bộ tiếng Anh, app trao đổi ngôn ngữ).

---

## 2. Người dùng

- **Trước mắt:** chính chủ dự án, làm phần mềm/IT, trình độ khoảng **A2**. Đọc tài liệu kỹ thuật được nhờ quen từ, nhưng nghe, nói, viết còn yếu. Có nhiều thời gian (đang không có việc), không có ngân sách học thêm. Gói nội dung `core` → `work` → `interview`, thêm `dev`.
- **Bạn bè được giới thiệu:** trình độ khác nhau, nhiều người không làm IT, học trên điện thoại. Họ cần lần đầu mở app là hiểu ngay, có bài xếp mức, có hướng dẫn lấy key AI miễn phí từng bước, và vẫn học được nếu bỏ qua bước lấy key.
- **Sau này:** người ngành khác (khách sạn, điều dưỡng, bán hàng...). Họ không tự tạo được API key và học chủ yếu trên điện thoại. Vì vậy **giao diện và luồng không giả định người dùng là dev**, chỉ nội dung mang màu ngành, và **app phải dùng tốt khi không có AI**.

---

## 3. Phương pháp học

| Nguyên lý | Áp dụng |
|---|---|
| Input hiểu được (i+1) | Đoạn văn ngắn đúng thể loại ngành, chạm vào cụm để xem nghĩa |
| Học cụm, không học từ rời | Đơn vị ghi nhớ là câu và cụm (*"Could you take a look at…"*) |
| Tự nhớ lại (retrieval) | Bài ôn luôn bắt **nhớ ra**: điền vào câu, nghe rồi gõ, nói lại |
| Ôn ngắt quãng (FSRS) | Lịch ôn tự động, có trần thẻ mỗi ngày |
| Buộc phải nói/viết (pushed output) | Mỗi phiên có một nhiệm vụ viết/nói thật, dùng lại cụm vừa học |
| **Giàn giáo (scaffolding)** | Bí thì có gợi ý theo bậc, từ câu hỏi gợi ý tới phần đầu câu rồi câu mẫu. Gợi ý xong vẫn để người học tự viết |
| **Viết lại (revise)** | Sau nhận xét, người học **sửa chính câu của mình**, không chỉ đọc bản sửa |
| Phản hồi tập trung vào lỗi của mình | Diff, giải thích tiếng Việt ngắn, lỗi thành thẻ ôn |
| **Nâng cấp câu đúng** | Câu đúng vẫn được gợi ý 1–2 cách nói tự nhiên/đa dạng hơn. Chọn cách nào thì cách đó thành thẻ |
| Shadowing | Nghe rồi nói theo câu chính, app so khớp từng từ |
| Học trên nội dung của mình | "Bỏ túi": dán email/ticket thật |
| Ngày làm xong được | Phiên có điểm kết thúc rõ ràng |
| **Nói liền (fluency)** | Nói 1–2 phút theo đề không dừng, đo tốc độ và chỗ ngập ngừng, lần sau so với lần trước |
| **Đúng mức (A2 trước)** | Bài xếp mức chọn gói bắt đầu. Ở mức thấp thì giải thích và gợi ý bằng tiếng Việt nhiều hơn, câu ngắn hơn |

---

## 4. Vòng lặp một phiên

| # | Bước | Người học làm gì | Có AI | Không AI |
|---|---|---|---|---|
| 1 | **Ôn** | Thẻ đến hạn | Chấm câu tự do | So khớp, cho lệch nhỏ |
| 2 | **Nạp** | Đọc/nghe đoạn ngắn, chọn cụm muốn học | Giải thích theo ngữ cảnh | Nghĩa viết sẵn |
| 3 | **Nói theo** | Nói theo 2–3 câu chính | – | Web Speech, so từng từ |
| 4 | **Dùng** | Viết/nói theo nhiệm vụ thật (vòng con bên dưới) | Người kèm học | Câu mẫu + kiểm cụm + tự chấm |
| 5 | **Chốt** | Xem hôm nay học được gì, mai ôn gì | – | – |

### 4.1 Vòng con của bước Dùng: viết → nhận xét → viết lại
1. **Viết.** Nút **"Gợi ý"** có 3 bậc, bấm bậc nào mở bậc đó:
   - Bậc 1: câu hỏi gợi ý bằng tiếng Việt ("Hôm nay bạn định làm gì?").
   - Bậc 2: phần đầu câu ("Today I'll pick up…").
   - Bậc 3: một câu mẫu đầy đủ.

   Không có AI thì gợi ý lấy từ dữ liệu bài (`task.hints`).
2. **Kiểm tra.** Chỉ hiện **một khung nhận xét**, theo thứ tự:
   1. **Đủ ý chưa:** so với yêu cầu đề, ví dụ "Thiếu phần hôm nay làm gì".
   2. **Cụm bắt buộc** đã dùng chưa.
   3. **Lỗi:** diff kèm lý do. Tích chọn lỗi nào thì lỗi đó thành thẻ.
   4. **Nâng cấp:** 1–2 cách nói khác hay hơn, mỗi cách có ghi chú ngắn. Có cả khi câu đã đúng.
   5. **Một lời khen cụ thể**, chỉ khi thật sự có điều đáng khen.

   Nếu luật và AI cho kết quả ngược nhau thì gộp lại trước khi hiện, không bao giờ hiện hai câu trái nhau.
3. **Viết lại.** Người học sửa trên chính câu của mình. Mỗi lần kiểm tra lưu thành một **phiên bản**. "Tiếp" chỉ là nút chính khi đã đủ ý, nhưng luôn có nút "Bỏ qua" (ghi lại là đã bỏ).

### 4.2 Quy tắc UX của vòng lặp
- Mỗi màn **một nút chính**, cùng một chỗ (đáy màn trên mobile, `Enter` trên desktop).
- **Thanh bước bấm được:** quay lại bước đã qua để xem hoặc làm lại. Bước chưa tới thì khoá, có chú thích vì sao.
- **Không mất gì:** câu đang gõ tự lưu nháp. Thoát hoặc tải lại trang thì quay về đúng chỗ, đúng chữ đang gõ.
- Ôn có trần (mặc định 20 thẻ mỗi ngày), không bao giờ hiện "bạn nợ 143 thẻ".

![Bước Dùng và Sửa](mockups/02-produce-feedback.svg)

---

## 5. Màn hình

| Màn | Mục đích |
|---|---|
| **Bắt đầu (lần đầu mở)** | Chào, bài xếp mức ngắn (nghe, đọc, viết, nói), chọn số phút mỗi ngày, bài mốc ghi âm. Lấy key AI là bước tuỳ chọn, có hướng dẫn |
| **Hôm nay** | Một thẻ lớn "Bài tiếp theo · Bắt đầu", dòng "Tuần 3/16", 3 con số nhỏ |
| **Nói với AI** | Hội thoại bằng giọng hoặc phỏng vấn thử. AI nói chậm, có nút "nói lại" và "giải thích bằng tiếng Việt". Xong thì có bản ghi và nhận xét. Ghi lại cả buổi nói với người thật ("Sau buổi nói") |
| **Phiên học** | Các bước ở mục 4, toàn màn hình |
| **Lộ trình / Trang bài** | Chủ đề → bài. Xem trước, đọc lại, học lại, **xem các bài viết cũ của bài này** |
| **Ôn** | Ôn riêng ngoài phiên |
| **Hội thoại** | Đóng vai: tech lead, PM, khách hàng. Không có AI thì dùng kịch bản rẽ nhánh |
| **Bỏ túi** | Dán văn bản thật, chọn câu muốn học |
| **Sổ lỗi** | Lỗi theo nhãn, lỗi nào còn lặp, luyện riêng nhóm lỗi |
| **Bài viết của tôi** | Mọi bài đã viết, theo từng phiên bản, kèm nhận xét. Thấy được lần sau tốt hơn lần trước |
| **Tiến bộ** | Chuỗi ngày, câu đã thuộc, lỗi giảm theo tuần, so với bài mốc |
| **Cài đặt** | AI (BYOK), giọng đọc, số phút, sáng/tối, xuất/nhập |

---

## 6. Thẻ ôn

Một câu hoặc cụm lần lượt đi qua các dạng: nhận ra → điền vào câu → nghe rồi gõ → dịch ngược → dùng trong tình huống. Ngoài thẻ nội dung, có thêm:
- **Thẻ lỗi:** câu sai của chính mình, người học sửa lại.
- **Thẻ nâng cấp:** câu của mình, người học viết lại theo cách hay hơn đã chọn.

---

## 7. Nội dung

- Cấu trúc: Track (ngành) → Unit (chủ đề) → Snippet, Chunk, Task, Scenario. Thêm ngành = thêm thư mục `content/tracks/<ngành>/`, **không sửa code**.
- Task phải có: đề, **các ý cần có** (để chấm đủ ý), cụm bắt buộc, câu mẫu, **gợi ý 3 bậc**.
- Hiện có: `core` (Nền, 8 unit mức A2: giới thiệu, một ngày đi làm, đang làm gì, quá khứ, kế hoạch, hỏi lại, kinh nghiệm, ý kiến; 24 bài, khoảng tháng 1), `work` (Công việc chung, 5 unit: họp, email, gọi điện, giải thích vấn đề, khách hàng; đứng đầu lộ trình của mọi ngành), `dev` (standup, ticket, PR; mức B1), `hospitality` (thử mở rộng) và bộ **Phỏng vấn** (`content/interview.json`, 10 câu hỏi và phỏng vấn thử). Người xếp mức A0–A2 học `core` trước rồi sang ngành.
- Cần thêm, theo thứ tự:

| Gói | Mức | Nội dung |
|---|---|---|
| `core` (Nền) | A2→B1 | Mẫu câu theo thì, cụm thông dụng, hội thoại hằng ngày, phát âm |
| `work` (Công việc) | B1 | Họp, email, gọi điện, giải thích một vấn đề, làm với khách hàng. Dùng được cho mọi ngành |
| `interview` (Phỏng vấn) | B1 | Tự giới thiệu, kể dự án theo STAR, điểm mạnh/yếu, hỏi lại nhà tuyển dụng. Dán CV để AI giúp soạn câu trả lời của chính mình |

- **Quy trình soạn:** AI soạn nháp theo khuôn (`content/prompts/unit.md`), `content:check` kiểm schema và mức (câu A2 tối đa 14 từ, task đủ ý cần có và gợi ý), một model khác kiểm lại câu chữ và mức CEFR (`npm run -s content:review -- <unit>` in sẵn prompt), rồi ghi `review` vào unit. Người học ở mức A2 chưa tự duyệt chắc được, nên bước kiểm chéo là bắt buộc. App chạy không cần AI.

---

## 8. Nguyên tắc UX

1. **Luôn có "tiếp theo".** Kiểm thử như người lần đầu dùng.
2. **Một việc mỗi màn**, một nút chính. Thông tin phụ thu gọn, chỉ mở khi cần.
3. **Không có X đỏ**, nhưng **cũng không khen suông**. Lỗi màu hổ phách, kèm cách nói đúng.
4. **Đi lại nhanh:** thanh bước, breadcrumb, nút quay lại đều bấm được.
5. **Ngày làm xong được**, chuỗi ngày có ngày nghỉ.
6. **Có sức sống:** mỗi bước một màu nhận diện. Có phản hồi khi hoàn thành (hiệu ứng nhẹ, tắt được). Xem [THIET-KE.md](THIET-KE.md).
7. **Dữ liệu là của người học:** lưu trong máy, tự lưu liên tục, xem lại được, xuất/nhập được. Học trên nhiều máy thì đồng bộ qua gist bí mật trên GitHub (hoặc Google Drive) của chính người học, không qua server của app.
8. Giao diện tiếng Việt, nội dung tiếng Anh. Chữ giao diện gom ở `src/copy/vi.ts`.

---

## 9. AI và khi không có AI

| Chỗ dùng | Không có AI thì |
|---|---|
| Người kèm học ở bước Dùng (đủ ý, lỗi, nâng cấp, gợi ý) | Luật + câu mẫu + gợi ý viết sẵn + tự chấm |
| Hội thoại | Kịch bản rẽ nhánh |
| Bỏ túi | Thẻ điền vào câu |

- Luật chạy trước, AI bổ sung. Kết quả AI là JSON có schema, sai schema thì dùng luật.
- Prompt AI phải biết **mục tiêu bài** (đề, ý cần có, cụm bắt buộc), không chỉ biết câu người học viết.
- Lưu đệm kết quả, đếm lượt mỗi ngày. Key chỉ nằm trong trình duyệt.
- Mở cho người khác: thiết kế để chạy tốt không có AI. Proxy giữ key chung để quyết định sau.

---

## 10. Đo tiến bộ thật
- Bài mốc ngày 1 (ghi âm + bài viết + bài xếp mức), làm lại sau mỗi 4 tuần, đặt cạnh nhau.
- Ngoài app: làm một bài kiểm tra trình độ miễn phí (ví dụ EF SET) ở tuần 1 và tuần 16.
- Giờ học thật mỗi tuần (app tự đếm), tốc độ nói và số chỗ ngập ngừng ở bài nói liền.
- Theo dõi: câu đã thuộc (độ ổn định trên 21 ngày), tỉ lệ nhớ, **nhãn lỗi giảm theo tuần**, **số lần viết lại để đạt yêu cầu giảm dần**.

---

## 11. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Mất dữ liệu | Tự lưu nháp, đồng bộ nhiều máy, xuất/nhập (gộp, không ghi đè), `navigator.storage.persist()`, nhắc sao lưu khi chưa bật đồng bộ |
| AI khen suông | Prompt chấm theo yêu cầu bài, gộp với luật, luôn có phần "nâng cấp" |
| Hết lượt AI | Luật + gợi ý viết sẵn, lưu đệm |
| Web Speech không ổn định | Gõ phím luôn dùng được |
| Nhàm chán | Màu theo bước, thấy rõ tiến bộ (bài viết cũ so với mới), nội dung từ Bỏ túi |
| Làm app thay vì học | Làm app tối đa 1–2 giờ/ngày. Học mỗi ngày ít nhất 2 giờ, kể cả khi sprint chưa xong |
| Nội dung AI soạn sai mà người học không biết | Model thứ hai kiểm lại, kiểm mức CEFR, ưu tiên câu ngắn và phổ biến |
| Bạn bè bỏ cuộc ở bước lấy key | Key là tuỳ chọn, app học được không có AI, hướng dẫn từng bước có hình |

Xem tiếp: [LO-TRINH.md](LO-TRINH.md) · [KIEN-TRUC.md](KIEN-TRUC.md) · [THIET-KE.md](THIET-KE.md)
