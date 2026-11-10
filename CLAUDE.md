# FluentLoop: ghi chú cho Claude

Bắt đầu bằng việc đọc `docs/PHAC-THAO.md`, sau đó tới `docs/LO-TRINH.md`.

## Cách làm việc với người dùng
- Trả lời bằng **tiếng Việt**.
- **Phân tích/phác thảo trước, chưa code** cho đến khi người dùng nói rõ "bắt đầu Sprint NN". Mỗi sprint cần câu đó riêng.
- Người dùng thích `npm install && npm run dev`: một app, không Docker/DB/backend nếu không thật sự cần.
- Việc không quan trọng thì tự chọn mặc định hợp lý. **Không deploy/publish** khi chưa được đồng ý.
- **Không tự `git commit`/`push`.** Chỉ commit khi người dùng yêu cầu rõ, cho đúng lượt đó. Không hỏi "commit không?", không nhắc chuyện commit; sửa xong để thay đổi trong working tree.
- **Giao diện phải đồng bộ toàn app**: đổi một mẫu UI thì sửa mọi màn dùng mẫu đó trong cùng lượt, qua component chung ở `src/ui/` và quy tắc ở `docs/THIET-KE.md` mục 4.1. Không làm riêng lẻ từng màn.
- AI dạng BYOK (Gemini/OpenRouter), key chỉ nằm trong trình duyệt. Không bao giờ xin key qua chat, không commit key. App phải dùng tốt khi không có AI.
- Dev server chạy cổng **3100**. **Không đụng cổng 3000**, chỉ kill đúng PID mình tạo, không `pkill` theo tên.
- Kiểm thử như **người lần đầu dùng**: luôn có "tiếp theo" rõ ràng. Báo đúng những gì chưa kiểm được (micro thật, iOS, AI thật).

## Bối cảnh
- Tách từ Lingua Quest (`~/Desktop/LINGUA QUEST`, game 3D học tiếng Anh). Người dùng bỏ hướng game vì quá phức tạp.
- Code tái sử dụng được liệt kê ở `docs/KIEN-TRUC.md` mục 8. Chép sang rồi rút gọn, không import chéo.
- Câu hỏi mở cần người dùng trả lời trước Sprint 01: `docs/PHAC-THAO.md` mục 13.
