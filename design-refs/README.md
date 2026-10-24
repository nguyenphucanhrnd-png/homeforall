# HomeForAll — Bộ nền 3D cuộn (v3, dùng cho Windows)

Mục tiêu: một video master 30 giây → 9 cảnh + 10 ảnh tĩnh (mỗi trang một ảnh) → Claude Code ghép vào web.
Mọi thứ phải thật (ảnh thú thật, chữ, nút, điểm bấm) là code phủ lên trên; trong video không có chữ/logo/ảnh thú thật.

## 0. Hai điều cần biết trước

1. **Video master hiện tại là 1280×720, KHÔNG phải 4K.** Script không "giả 4K" (không kéo giãn). Muốn 4K thật phải upscale bằng AI trước (mục 4). Trong lúc chưa upscale, mọi ảnh/plate cắt ra là 1280 px và script báo `NOT 4K` rõ ràng.
2. **Claude Code phải chạy đúng thư mục gốc dự án** (mục 1). Nếu chạy sai thư mục nó không thấy `design-refs/` và sẽ đoán mò.

## 1. Cấu trúc thư mục (bắt buộc đúng)

```
<thư-mục-gốc-dự-án>/          <- chạy `claude` và mọi lệnh python Ở ĐÂY
├─ package.json                <- file này cho biết bạn đang ở đúng chỗ
├─ design-refs/
│  ├─ video/master.mp4         <- video gốc của bạn (không bao giờ bị sửa/xoá)
│  ├─ video/master-timecodes.txt   <- mốc giây từng cảnh (đã đo theo video thật)
│  ├─ scripts/hfa_media.py     <- công cụ xử lý (Python + ffmpeg)
│  ├─ media.config.json        <- cấu hình (vị trí logo, độ rộng plate/ảnh)
│  ├─ storyboard.md, CLAUDE_CODE_PROMPT.md, prompts/, CREDITS.md
│  └─ mascots/, real-photos/   <- ảnh nhân vật tách nền, ảnh thú thật (không commit real-photos)
└─ public/assets/
   ├─ plates/s01..s09/         <- do script tạo (chuỗi khung WebP + poster + last + manifest)
   └─ stills/*.webp            <- do script tạo (10 ảnh đầu trang)
```

Cách mở Claude Code đúng:
1. Giải nén gói này **vào thư mục gốc dự án** (nơi có `package.json`); gộp thư mục `design-refs` và `public`.
2. Mở terminal ngay tại đó (Windows: chuột phải trong thư mục → *Open in Terminal*, hoặc `cd D:\duong-dan\HomeForAll`).
3. Gõ `pwd` (PowerShell: `pwd`; cmd: `cd`) để chắc chắn đúng, rồi gõ `claude`.
4. Dán `design-refs/CLAUDE_CODE_PROMPT.md` (hoặc `HomeForAll_super_prompt_v4.md`). Cả hai đều bắt Claude Code in ra thư mục đang đứng và dừng lại nếu không thấy `package.json` + `design-refs/`.
5. Nếu video/ảnh của bạn nằm ngoài dự án: copy vào `design-refs/video/` (khuyên dùng). Hoặc trong Claude Code gõ `/add-dir D:\duong-dan` để cấp thêm quyền đọc thư mục đó (lệnh này có trong Claude Code; bạn kiểm tra bằng `/help` nếu bản của bạn khác).

## 2. Cài đặt một lần (Windows)

1. **ffmpeg**: mở PowerShell, gõ `winget install Gyan.FFmpeg`, rồi **mở terminal mới** và gõ `ffmpeg -version`. (Cần bản có libx264 và libwebp; bản Gyan có đủ.)
2. **Python**: bạn đã có Anaconda; dùng lệnh `python` trong Anaconda Prompt hoặc terminal đã nhận Python (kiểm tra `python --version`, cần 3.8 trở lên). Script không cần cài thêm thư viện nào.

## 3. Quy trình (4 lệnh)

Chạy từ thư mục gốc dự án:

```
python design-refs/scripts/hfa_media.py check          # đọc video, báo độ phân giải, kiểm tra mốc giây
python design-refs/scripts/hfa_media.py logo-preview   # tạo design-refs/frames/_logo-check.png (trái: trước, phải: sau). MỞ RA XEM
python design-refs/scripts/hfa_media.py all            # cắt 9 cảnh + 10 ảnh tĩnh + tạo plates
```

Tuỳ chọn: `--time 22` (logo-preview ở giây khác), `--still-width 3840`, `--plate-width 1920`, `--strict` (báo lỗi nếu nguồn chưa phải 4K), `--delogo` / `--no-delogo`.

Script tự chọn nguồn theo thứ tự: `video/master-4k.mp4` → `video/master-clean.mp4` → `video/master.mp4`.

**Logo Gemini**: script xoá ngôi sao nhỏ góc dưới phải bằng mặt nạ đúng hình sao (không làm mờ cả khung chữ nhật). Trên video của bạn mình đã thử ở nhiều khung; còn lại vệt rất nhẹ ở vài khung nền nhiều chi tiết. Chỉ xoá logo **nhìn thấy được**; Google còn gắn dấu nước vô hình SynthID, không ảnh hưởng hình ảnh. Hãy đọc điều khoản công cụ bạn dùng (gói trả phí có thể có bản tải không logo) và ghi vào `CREDITS.md`.

**Kết quả**: `public/assets/plates/sNN/`, `public/assets/stills/*.webp`, và PNG không nén của ảnh tĩnh ở `design-refs/stills-master/` (dùng làm gốc để chỉnh sửa/in).

## 4. Nâng lên 4K thật (làm 1 lần, trên máy bạn)

Quy tắc kích thước: **4K là bản master**, không phải thứ gửi cho trình duyệt. Một khung 3840×2160 chiếm ~33 MB bộ nhớ khi giải mã, nên:
- chuỗi khung cuộn (plates): **1920 rộng** (mặc định);
- ảnh tĩnh đầu trang và poster: **tới 3840 rộng** (mỗi trang chỉ tải 1 ảnh).

Bước 4.1 — thử nhanh trên 2 giây (đừng upscale 30 giây ngay):
```
python design-refs/scripts/hfa_media.py clean     # master-clean.mp4: đã xoá logo, bỏ âm thanh, giữ 720p
python design-refs/scripts/hfa_media.py sample    # tạo design-refs/video/_test-2s.mp4
```
Bước 4.2 — upscale `_test-2s.mp4` bằng một trong các cách (thử theo thứ tự):
1. **Ngay trong công cụ tạo video**: Google cho biết Gemini Omni 1.1 Flash cho phép đưa kết quả cuối lên 1080p/4K bằng upscale. Mình chưa kiểm chứng nút này có trong gói và có áp dụng cho cảnh kéo dài hay không; bạn xem trong giao diện Flow / AI Studio.
2. **Video2X trên máy bạn** (miễn phí, mã nguồn mở, AGPL-3.0). Theo trang GitHub của dự án: cần GPU hỗ trợ Vulkan (NVIDIA Kepler/GTX 600 trở lên, AMD GCN 1.0/HD 7000 trở lên, Intel HD 4000 trở lên) và CPU có AVX2; có bộ cài Windows giao diện (Qt6) ở github.com/k4yt3x/video2x/releases. Dòng lệnh theo tài liệu docs.video2x.org:
   ```
   video2x -i design-refs\video\_test-2s.mp4 -o design-refs\video\_test-2s-up.mp4 -p realesrgan -s 4 --realesrgan-model realesr-animevideov3
   ```
   Thử thêm `--realesrgan-model realesrgan-plus` rồi so sánh (mình chưa kiểm chứng model nào hợp đất sét hơn, hãy nhìn bằng mắt). Nếu bạn dùng bản giao diện thì chọn Real-ESRGAN, scale 4×.
3. **Công cụ upscale trả phí**: nhiều lựa chọn; mình chưa kiểm chứng giá/chất lượng, hãy dùng bản dùng thử với cùng đoạn 2 giây.

Bước 4.3 — **tiêu chí nhận (nhìn ở 100%)**: vân tay đất sét còn rõ; không viền sáng quanh vật thể; mắt/ria mèo không méo; không nhấp nháy giữa các khung; sàn/tường không "bệt sáp".

Bước 4.4 — upscale cả file `master-clean.mp4` bằng cách đã chọn, lưu vào `design-refs/video/` (ví dụ `master-up.mp4`), rồi:
```
python design-refs/scripts/hfa_media.py fit4k --source design-refs/video/master-up.mp4   # ép đúng 3840x2160 -> master-4k.mp4
python design-refs/scripts/hfa_media.py check --strict                                  # phải báo "3840x2160 is true 4K"
python design-refs/scripts/hfa_media.py all
```
(Upscale 4× từ 1280 cho 5120×2880; `fit4k` thu về đúng 3840×2160. Lệnh từ chối nếu nguồn quá nhỏ, để không giả 4K.) Vì `master-clean.mp4` đã xoá logo từ trước nên `all` sẽ không xoá lần nữa.

**Nếu không upscale được**: dùng nguyên 720p cho plates (vẫn dùng được cho cuộn), còn ảnh tĩnh đầu trang sẽ mềm trên màn lớn. Khi đó ưu tiên upscale riêng 10 ảnh tĩnh (đơn giản hơn nhiều so với video).

## 5. Điểm yếu của video hiện tại (đã đo, đừng bỏ qua)

| Vấn đề | Giây | Cách xử lý |
|---|---|---|
| Chuyển cảnh bị "bóng ma" (cửa nhà đè lên bậu cửa sổ) | ~24.0–24.9 | Mốc giây đã tránh đoạn này. Nếu làm lại video, bỏ chuyển cảnh kiểu hoà trộn ở đây |
| Cảnh "mạng lưới" cuối chỉ có vài vòng cung vàng mờ, chỉ ~1.2 s sạch | 28.8–30.0 | Lớp nút vai trò (SVG) trong code sẽ gánh nghĩa của cảnh. Nên làm lại Segment 3 cuối nếu muốn mạnh hơn (prompt mới trong `prompts/master-30s.md`) |
| Cảnh "kết nối" (s06) chỉ có dải tim, chưa có "chỗ" cho ảnh thẻ | 18.4–21.3 | Đúng thiết kế: ảnh thú thật là lớp code R3F |
| Cảnh 15.0–15.5 có khung cửa xanh lấn vào phòng nuôi tạm | 14.1–15.5 | Đã tránh; foster bắt đầu 15.6 |
| Có track âm thanh | — | Script luôn bỏ âm thanh |
| Cảnh nuôi tạm chỉ ~1.9 s, cảnh nhận nuôi ~2.1 s | — | Ngắn cho cuộn; engine kéo giãn theo thanh cuộn. Muốn mượt hơn: tạo lại với mỗi cảnh ≥3 s |

## 6. Bảng cảnh (thông tin đã đo trên video thật; số liệu nằm trong `video/master-timecodes.txt`)

| Cảnh | Giây | Nội dung |
|---|---|---|
| s01 hero | 0.0–3.1 | Nhà đất sét mái cam, chó + mèo, camera lùi |
| s02 alley-night | 4.2–7.4 | Hẻm đêm mưa, Miu dưới mái tôn |
| s03 rescue | 7.7–11.0 | Tình nguyện viên không mặt đến, dấu chân phát sáng, mang lồng |
| s04 clinic | 11.5–14.0 | Phòng khám xanh, huy hiệu quanh Miu |
| s05 foster | 15.6–17.5 | Phòng nuôi tạm, Miu ngủ trên đệm |
| s06 connect | 18.4–21.3 | Hoàng hôn đào, dải tim/dấu chân trên mái nhà |
| s07 home-door | 21.8–23.9 | Nhà mới, cửa mở, gia đình đón Miu |
| s09 follow-up | 25.0–27.7 | Sáng hôm sau, lịch có 3 trái tim sáng |
| s08 network | 28.8–30.0 | Khu phố hoàng hôn, vòng cung vàng |

Ảnh tĩnh mỗi trang: `about-hero` 2.4 s · `help-calm` 7.2 · `volunteer-header` 10.4 · `care-header` 13.4 · `foster-header` 16.4 · `pets-header` 20.5 · `login-door` 22.2 · `adopt-door` 23.4 · `stories-header` 26.6 · `partners-header` 29.2.

## 7. Ảnh nhân vật tách nền và ảnh thú thật

- Nhân vật tách nền (tuỳ chọn): tạo theo `prompts/image-prompts.md`, tách nền, lưu PNG trong suốt vào `mascots/` (`miu-front.png`, `dog-front.png`…). Kiểm tra giấy phép/điều khoản của công cụ tách nền.
- Ảnh thú thật chỉ lấy từ đối tác cứu hộ, có đồng ý lưu lại; chụp dọc 3:4, tối thiểu 1600 px cạnh dài; đặt tên `HFA-0001-1.jpg`; bỏ vào `real-photos/` và **không commit**. Chưa có ảnh thật thì web dùng hình minh hoạ có nhãn DEMO. Không dùng ảnh AI/stock cho thú đang chờ nhận nuôi.
- Ghi mọi tài sản AI/stock vào `CREDITS.md`. Nên có dòng ghi chú công khai (ví dụ trang giới thiệu) rằng hình minh hoạ do AI tạo.

## 8. Gỡ lỗi nhanh

| Vấn đề | Cách xử lý |
|---|---|
| `ffmpeg not found` | Cài lại ffmpeg, mở terminal MỚI |
| `python` không nhận | Dùng Anaconda Prompt, hoặc `py design-refs/scripts/hfa_media.py ...` |
| Báo "Missing media.config.json" / không thấy file | Bạn không đứng ở thư mục gốc dự án |
| `NOT 4K` | Đúng như dự kiến khi chưa upscale (mục 4) |
| Vệt logo còn thấy ở một ảnh | Đổi giây của ảnh đó trong `master-timecodes.txt` (±0.3 s), hoặc chạy `logo-preview --time <giây>` để xem |
| Plates quá nặng | `--plate-width 1600` hoặc `--quality 65` hoặc `--fps 10` |
| Cuộn giật trên máy yếu | Bật chế độ "Giảm hiệu ứng" (ảnh tĩnh `last.webp`) |
| Nhân vật đổi hình giữa các cảnh khi tạo lại video | Đính ảnh nhân vật làm tham chiếu; dán lại GLOBAL BLOCK |
