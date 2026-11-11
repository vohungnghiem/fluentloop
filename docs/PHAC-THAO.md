# FLUENTLOOP – PHÁC THẢO SẢN PHẨM

**Phiên bản:** 0.2 (2026-11-11). Viết lại cho đúng mục đích: **app học**, không phải game.
**Nhân sự:** 1 người · **Nền tảng:** web (PWA), ưu tiên mobile, desktop dùng tốt bằng bàn phím

> **Một câu:** mỗi ngày 15 phút học tiếng Anh **của chính công việc mình**. App là **người kèm học**: dạy, gợi ý khi bí, chỉ ra cách nói hay hơn, rồi biến lỗi và câu hay của bạn thành bài ôn ngày mai.

![Màn hình Hôm nay](mockups/01-today.svg)

---

## 1. Mục đích và điều KHÔNG làm

**Mục đích duy nhất:** người học **viết và nói được** câu tiếng Anh dùng trong công việc, ngày càng tự nhiên hơn, và **thấy được** mình tiến bộ.

Hệ quả cho mọi quyết định:
- Người dùng **đang học, chưa biết**. App không được "chấm đúng rồi cho qua". Câu đúng vẫn phải có thứ để học thêm (mục 4).
- Mỗi màn hỏi một câu: "màn này giúp người học nói/viết được gì?" Không trả lời được thì bỏ.
- Đã bỏ hẳn: thế giới 3D, NPC, cốt truyện, quest, XP, tim, bảng xếp hạng. Những thứ này không đưa trở lại.
- Tạo động lực bằng **tiến bộ thật** (lỗi giảm, câu đã thuộc, bài viết lần sau tốt hơn lần trước), không bằng điểm ảo.

---

## 2. Người dùng

- **Trước mắt:** chính chủ dự án, làm phần mềm/IT. Đọc được tài liệu, nhưng viết và nói chưa tự nhiên. Gói nội dung `dev`.
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
| **Hôm nay** | Một thẻ lớn "Bài tiếp theo · Bắt đầu" + 3 con số nhỏ |
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
- Hiện có: `dev` (standup, ticket, PR...) và `hospitality` (thử mở rộng).
- AI soạn nháp, người duyệt rồi mới commit. App chạy không cần AI.

---

## 8. Nguyên tắc UX

1. **Luôn có "tiếp theo".** Kiểm thử như người lần đầu dùng.
2. **Một việc mỗi màn**, một nút chính. Thông tin phụ thu gọn, chỉ mở khi cần.
3. **Không có X đỏ**, nhưng **cũng không khen suông**. Lỗi màu hổ phách, kèm cách nói đúng.
4. **Đi lại nhanh:** thanh bước, breadcrumb, nút quay lại đều bấm được.
5. **Ngày làm xong được**, chuỗi ngày có ngày nghỉ.
6. **Có sức sống:** mỗi bước một màu nhận diện. Có phản hồi khi hoàn thành (hiệu ứng nhẹ, tắt được). Xem [THIET-KE.md](THIET-KE.md).
7. **Dữ liệu là của người học:** lưu trong máy, tự lưu liên tục, xem lại được, xuất/nhập được.
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
- Bài mốc ngày 1 (ghi âm + bài viết), làm lại sau mỗi 4 tuần, đặt cạnh nhau.
- Theo dõi: câu đã thuộc (độ ổn định trên 21 ngày), tỉ lệ nhớ, **nhãn lỗi giảm theo tuần**, **số lần viết lại để đạt yêu cầu giảm dần**.

---

## 11. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Mất dữ liệu | Tự lưu nháp, xuất/nhập, `navigator.storage.persist()`, nhắc sao lưu |
| AI khen suông | Prompt chấm theo yêu cầu bài, gộp với luật, luôn có phần "nâng cấp" |
| Hết lượt AI | Luật + gợi ý viết sẵn, lưu đệm |
| Web Speech không ổn định | Gõ phím luôn dùng được |
| Nhàm chán | Màu theo bước, thấy rõ tiến bộ (bài viết cũ so với mới), nội dung từ Bỏ túi |

Xem tiếp: [LO-TRINH.md](LO-TRINH.md) · [KIEN-TRUC.md](KIEN-TRUC.md) · [THIET-KE.md](THIET-KE.md)
