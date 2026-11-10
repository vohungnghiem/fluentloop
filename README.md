# FluentLoop

![FluentLoop](docs/assets/logo.svg)

Mỗi ngày 15 phút, học tiếng Anh **của chính công việc mình**, theo vòng lặp **Ôn → Nạp → Nói theo → Dùng → Sửa → Chốt**. Lỗi của bạn trở thành bài ôn của ngày mai.

Trạng thái: **xong Sprint 05**: màn Tiến bộ, mốc ghi âm/bài viết, sao lưu/nhập file, PWA chạy offline. Trước đó: Bỏ túi (dán email/ticket hoặc dùng bookmarklet, chọn câu thành thẻ, AI dịch + tạo bài viết). Ôn → Nạp → Nói theo → Dùng (+ Sửa) → Chốt. Loa ở mọi câu, thẻ nghe rồi gõ, AI sửa bài tuỳ chọn (Gemini/OpenRouter, key trong trình duyệt), Sổ lỗi, lỗi thành thẻ ôn. Không AI, không micro vẫn học được. Trang /debug: nhảy ngày, nhảy bước, giả lập micro và AI. Nội dung: track `dev`, chủ đề Standup (6 đoạn, 23 cụm).

## Tài liệu
| File | Nội dung |
|---|---|
| [docs/PHAC-THAO.md](docs/PHAC-THAO.md) | Sản phẩm: người dùng, phương pháp học, vòng lặp, màn hình, nội dung, mở rộng ngành, gợi ý, câu hỏi mở |
| [docs/THIET-KE.md](docs/THIET-KE.md) | Design tokens, chữ, component, hệ thống minh hoạ, giọng văn |
| [docs/KIEN-TRUC.md](docs/KIEN-TRUC.md) | Stack, thư mục, dữ liệu, chấm bằng luật, AI, những gì mang từ Lingua Quest |
| [docs/LO-TRINH.md](docs/LO-TRINH.md) | Sprint 01–07 và điều kiện "xong" |
| [docs/mockups/](docs/mockups/) | Mockup SVG: Hôm nay, Dùng/Sửa, Ôn, Tiến bộ |

## Chạy
```bash
npm install
npm run dev            # http://localhost:3100
npm test               # unit test phần lõi + luồng ngày 1 / ngày 2
npm run content:check  # kiểm tra gói nội dung trong content/
npm run build
```
Không server, không DB, không Docker. AI là tuỳ chọn (bạn tự nhập key Gemini/OpenRouter trong Cài đặt).

Nguồn gốc: tách từ dự án Lingua Quest (`~/Desktop/LINGUA QUEST`).
