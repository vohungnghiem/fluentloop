# FLUENTLOOP – THIẾT KẾ GIAO DIỆN VÀ MINH HOẠ

Mục tiêu: **sạch, ấm, dễ đọc**. Không cần đồ hoạ xuất sắc, nhưng mọi hình ảnh phải **cùng một phong cách**.

![Logo](assets/logo.svg)

## 1. Cảm giác
- Giống một cuốn sổ tay gọn gàng, không giống bảng điều khiển hay game.
- Nền màu giấy ấm, chữ mực đậm, một màu chính, một màu nhấn.
- Chuyển động ít và ngắn (150–250ms), tắt được, tôn trọng `prefers-reduced-motion`.

## 2. Design tokens (CSS variables)

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--paper` | `#FAF7F2` | `#16181D` | Nền |
| `--surface` | `#FFFFFF` | `#1F2229` | Thẻ |
| `--ink` | `#1E2230` | `#ECEDEF` | Chữ chính |
| `--ink-soft` | `#5B6172` | `#A3A8B4` | Chữ phụ |
| `--line` | `#E7E1D8` | `#2E323B` | Viền |
| `--primary` | `#3B5BDB` | `#7C93F0` | Nút chính, tiến độ |
| `--primary-tint` | `#E8EDFF` | `#26305A` | Nền nhấn nhẹ |
| `--accent` | `#F2A93B` | `#F5BA5C` | Chuỗi ngày, lỗi cần sửa (**thay cho đỏ**) |
| `--accent-tint` | `#FFF3DC` | `#3D3220` | Nền đoạn bị sửa |
| `--good` | `#2F9E6E` | `#4CC38A` | Đúng, chữ được thêm vào trong diff |
| `--good-tint` | `#E3F6EC` | `#1E3A2D` | Nền đúng |

- **Màu theo track:** mỗi ngành có một `--track` riêng (dev: chàm `#3B5BDB`, sau này điều dưỡng: xanh ngọc, khách sạn: cam đất...), dùng cho minh hoạ và nhãn. Màu nút chính không đổi.
- Không dùng đỏ cho lỗi. Màu đỏ chỉ dành cho thao tác nguy hiểm (xoá dữ liệu).

## 3. Chữ
- **Be Vietnam Pro** (variable) cho giao diện. Dấu tiếng Việt đẹp, đọc tốt cả tiếng Anh.
- **JetBrains Mono** cho đoạn code, tên lệnh, thông báo lỗi trong snippet ngành dev.
- Cỡ chữ: câu học 20–22px, chữ thường 16px, chú thích 13px. Câu tiếng Anh đang học luôn là chữ to nhất trên màn hình.

## 4. Thành phần chính
| Component | Ghi chú |
|---|---|
| `StepBar` | 6 chấm hoặc đoạn trên cùng phiên học, bước hiện tại có nhãn chữ |
| `PrimaryAction` | Một nút to ở đáy, sticky trên mobile, có gợi ý phím `↵` trên desktop |
| `SentenceCard` | Câu EN to, nút loa, chạm vào cụm để xem nghĩa (popover) |
| `MicButton` | Đủ các trạng thái: sẵn sàng / đang nghe / đã nghe / không nghe thấy / bị chặn / mất mạng |
| `Diff` | Chữ bị bỏ: gạch ngang trên nền hổ phách. Chữ thêm vào: nền xanh. Có tóm tắt "1 chỗ sửa" |
| `ExplainNote` | Giải thích tiếng Việt ngắn, có nhãn lỗi (chip) |
| `RatingRow` | 4 mức FSRS với chữ thân thiện: Quên · Khó · Nhớ · Dễ |
| `StatTile` | Số to kèm nhãn nhỏ, dùng ở Hôm nay và Tiến bộ |
| `EmptyState` | Luôn có minh hoạ, một câu và một nút |

## 5. Hệ thống minh hoạ

**Phong cách:** hình phẳng, nét viền 2px bo tròn, tối đa 3 màu (`--ink`, `--track`, `--accent`) trên nền `--paper`. Không gradient, không bóng đổ phức tạp. Tô màu bằng `currentColor` và CSS variables, nên **tự đổi màu theo theme và theo track**.

Có ba lớp, từ dễ đến khó:

1. **Icon:** Lucide (nét 2px, bo tròn), đúng với phong cách trên. Dùng cho toàn bộ giao diện.
2. **Hình theo bước** (6 hình, tự vẽ SVG, khoảng 120×120): Ôn = chồng thẻ, Nạp = trang giấy kèm tai nghe, Nói theo = sóng âm, Dùng = bút, Sửa = hai dòng diff, Chốt = dấu tick trong vòng lặp. Vẽ một lần, dùng mãi.
3. **Hình theo chủ đề và trạng thái trống** (khoảng 10–15 hình): có ba nguồn, chọn một nguồn để giữ đồng bộ:
   - **Tự vẽ SVG** theo phong cách trên (Claude vẽ được dạng hình khối đơn giản). Đây là phương án đề xuất, vì đồng bộ tuyệt đối và nhẹ.
   - **Open Peeps / Humaaans** (giấy phép CC0) nếu muốn có hình người. Tô lại bằng 3 màu của mình.
   - Ảnh do AI tạo: **không khuyến khích**, vì khó đồng bộ phong cách và nặng.

**Mascot (tuỳ chọn):** "Lu", một bong bóng thoại tròn có mắt, chính là hình trong logo. Lu chỉ xuất hiện ở Chốt, ở trạng thái trống và ở onboarding, không chen vào giữa lúc học.

Minh hoạ mẫu và mockup trong `docs/mockups/` đã theo đúng hệ màu này.

## 6. Bố cục
- Mobile trước: một cột, rộng tối đa 560px, lề 16px, nút chính ở vùng ngón cái chạm tới.
- Desktop: cột học ở giữa (tối đa 640px), menu bên trái (Hôm nay · Ôn · Hội thoại · Bỏ túi · Sổ lỗi · Tiến bộ). Mobile thì dùng tab bar dưới, gồm 4 mục chính và mục "Thêm".
- Trong phiên học ẩn menu, chỉ có `StepBar` và nút thoát.

## 7. Giọng văn (copy)
- Tiếng Việt, ngắn, xưng "bạn", động viên cụ thể, không sáo rỗng.
- Đúng: *"Gần đúng rồi. Chỉ thiếu 'the' trước 'API'."* Sai: *"Sai! Thử lại."*
- Nút là động từ: **Bắt đầu**, **Nghe lại**, **Kiểm tra**, **Tiếp**, **Xong hôm nay**.

## 8. Mockup
| | |
|---|---|
| ![](mockups/01-today.svg) | ![](mockups/02-produce-feedback.svg) |
| ![](mockups/03-review.svg) | ![](mockups/04-progress.svg) |

Mockup chỉ để định hướng bố cục và màu. Chi tiết sẽ chốt khi làm từng sprint.
