# FLUENTLOOP – LỘ TRÌNH

Mỗi sprint chỉ bắt đầu khi người dùng nói **"bắt đầu Sprint NN"**. Mỗi sprint kết thúc bằng một thứ **dùng được hằng ngày**.

## Đã xong (Sprint 01–09)
Vòng lặp Ôn → Nạp → Nói theo → Dùng → Chốt, FSRS, giọng nói và trang kiểm tra micro, sửa bằng AI (BYOK) và Sổ lỗi, Bỏ túi, Tiến bộ và PWA, Hội thoại, track thứ hai (`hospitality`), điều hướng chung, Lộ trình và trang bài, Cài đặt gọn, deploy GitHub Pages.

**Đánh giá sau khi dùng thật (2026-11-11): 4/10.** Cụ thể:
- AI chỉ sửa lỗi rồi khen. Không kiểm đủ ý, không gợi ý khi bí, không nâng cấp câu đã đúng. Có lúc hiện hai nhận xét trái nhau.
- Thanh bước không bấm được. Màn Dùng xếp chồng nhiều khung giống nhau nên rối.
- Toàn app chỉ có một tông màu, nhìn đơn điệu, không có phản hồi khi hoàn thành.
- Câu đang gõ không được lưu. Không xem lại được các bài đã viết.

## Tiếp theo

| Sprint | Nội dung | Xong khi |
|---|---|---|
| **10: Người kèm học** ✅ | Prompt mới: chấm theo đề (ý cần có, cụm bắt buộc), lỗi, **nâng cấp**, chỉ khen khi đáng. Gộp luật với AI thành **một khung nhận xét**. Nút **Gợi ý 3 bậc** (AI hoặc `task.hints`). Vòng viết → nhận xét → viết lại, mỗi lần là một phiên bản. Thêm `points` và `hints` vào schema task, bổ sung cho các task hiện có | Viết nửa câu thì app chỉ ra phần còn thiếu. Câu đúng vẫn có cách nói hay hơn. Bí thì bấm Gợi ý và viết tiếp được. Không AI vẫn có gợi ý và kiểm đủ ý ở mức cơ bản |
| **11: Đi lại và không mất gì** ✅ | Thanh bước bấm được (quay lại bước đã qua). Tự lưu nháp mọi ô nhập. Tải lại trang thì về đúng chỗ. Màn Dùng sắp lại: câu mẫu thu gọn, thông tin phụ ẩn đi | Thoát giữa chừng, mở lại vẫn còn chữ đang gõ. Từ bước Dùng về lại Nạp trong 1 chạm |
| **12: Giao diện có sức sống (toàn app)** ✅ | Token màu theo bước, phân cấp chữ rõ, hiệu ứng khi hoàn thành (tắt được), minh hoạ theo bước. Sửa ở `src/ui/` và [THIET-KE.md](THIET-KE.md), áp cho mọi màn cùng lúc | Chụp 5 màn chính: nhìn ra ngay đang ở bước nào. Sáng/tối đều đạt tương phản AA |
| **13: Bài viết của tôi** | Màn lịch sử bài viết (theo bài, theo phiên bản, kèm nhận xét). Trang bài hiện các lần viết trước. Tiến bộ có "lỗi hay gặp" và "số lần viết lại giảm dần". Xuất/nhập gồm cả phần này | Mở lại bài standup tuần trước, thấy bài cũ, bài mới và chỗ đã tiến bộ |

Sau Sprint 13: dùng thật 1–2 tuần, chấm lại, rồi mới tính tới nội dung mới hoặc mở cho người khác.

## Nguyên tắc kiểm thử
- Test như **người lần đầu dùng**: màn nào cũng có "tiếp theo" rõ ràng.
- Báo đúng sự thật: cái gì chưa kiểm (micro thật, iOS, AI thật) thì ghi rõ là chưa kiểm.
- Logic trong `src/core` có unit test và nhận `now` làm tham số.
