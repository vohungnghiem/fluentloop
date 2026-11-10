# FLUENTLOOP – LỘ TRÌNH

Mỗi sprint chỉ bắt đầu khi bạn nói **"bắt đầu Sprint NN"**. Mỗi sprint kết thúc bằng một thứ **dùng được hằng ngày**, không chỉ là phần nền.

| Sprint | Nội dung | Xong khi |
|---|---|---|
| **01: Vòng lặp tối thiểu** | Dựng Vite + design tokens + Dexie. Track `dev` chủ đề 1 (Standup) có khoảng 6 snippet. Phiên gồm **Nạp → Dùng (so với mẫu) → Chốt**. Thẻ điền vào câu + FSRS. Màn Hôm nay | Bạn học được 1 phiên 10 phút **không cần AI, không cần micro**. Mai mở lại có thẻ đến hạn. Người lần đầu dùng không bị kẹt |
| **02: Giọng nói** | Mang `speech` từ Lingua Quest sang. Nút loa ở mọi câu. Bước **Nói theo**. Thẻ nghe rồi gõ. Trang kiểm tra micro | Chạy với micro thật của bạn ở nhà (chưa kiểm được thì ghi rõ "chưa kiểm") |
| **03: Sửa bằng AI + Sổ lỗi** | BYOK, `correctWriting`, Diff, nhãn lỗi, lỗi thành thẻ, màn Sổ lỗi, đếm lượt, lưu đệm | Một tuần dùng thật: Sổ lỗi thấy được lỗi lặp lại |
| **04: Bỏ túi** | Dán văn bản, tách câu, chọn câu thành thẻ. Có AI thì tạo nhiệm vụ. Bookmarklet | Học được từ email/ticket thật của bạn |
| **05: Tiến bộ + PWA** | Màn Tiến bộ, mốc ghi âm/bài viết, xuất/nhập, cài lên điện thoại, offline | Học trên điện thoại khi không có mạng (trừ AI) |
| **06: Hội thoại** | Roleplay có AI và kịch bản rẽ nhánh khi không có AI. Chủ đề 2–3 (Ticket, PR) | Một buổi standup giả và một code review giả |
| **07: Track thứ hai (thử mở rộng)** | Một ngành khác nhỏ (ví dụ khách sạn), chỉ thêm dữ liệu. Đo xem có phải sửa code không | Thêm ngành **không sửa code**. Nếu phải sửa thì sửa kiến trúc ngay lúc này |

Sau Sprint 07: quyết định có mở cho người khác không, và cách nào (KIEN-TRUC mục 9, PHAC-THAO mục 9.3).

## Nguyên tắc kiểm thử (mang từ Lingua Quest)
- Test như **người lần đầu dùng**: mọi màn hình đều có "tiếp theo" rõ ràng. Không dùng script đã biết đường để thay cho việc thử thật.
- Báo đúng sự thật: chưa kiểm cái gì (micro thật, iOS, AI thật) thì ghi rõ là chưa kiểm.
- Logic trong `src/core` phải có unit test và chạy theo thời gian `now` truyền vào.
