# Video dự thi "Cẩm nang An toàn số" — trạng thái sản xuất

> Tách riêng khỏi [PROJECT.md](PROJECT.md) vì đây là một hạng mục dự thi khác (video
> giới thiệu mô hình), không phải một phần của website — dùng chung tư liệu/thương hiệu
> nhưng là sản phẩm/kịch bản/kế hoạch nộp bài riêng (xem PHẦN III kịch bản gốc).

## Kịch bản gốc

`Audio/Kịch bản.backup-20260819-222106.docx` — kịch bản chính thức 5 cảnh, 1 phút 34
giây thực tế (lời bình đọc nhanh hơn mốc 2 phút 45 giây ước tính ban đầu trong kịch bản),
đúng nội dung PHẦN II của kịch bản dự thi (không phải kịch bản quảng bá website riêng như
từng nhận định nhầm ở phiên trước).

Lời bình thật đã ghi âm: `Audio/1. Nam.mp3` (Cảnh 1), `Audio/2. Nữ.mp3` (gộp liền Cảnh
2+3+4), `Audio/3. Nam.mp3` (Cảnh 5).

## Pipeline dựng video (tự động hoá được phần nào)

- `scripts/video/build_slides.py` (Python + Pillow): tự vẽ 5 ảnh nền 1920×1080 theo
  đúng màu thương hiệu site (đỏ `#d62828`, vàng `#e8b923`, nền kem `#fdf8ec`) cho 5 cảnh
  — vì môi trường làm việc không lấy được ảnh chụp màn hình thật của site (giới hạn công
  cụ trình duyệt), nên đây là đồ hoạ mô phỏng, KHÔNG phải screen-recording thật.
- `scripts/video/build_video.sh` (cần `ffmpeg`, đã cài qua `winget install Gyan.FFmpeg`):
  ghép 5 ảnh nền (mỗi ảnh giữ đúng thời lượng theo lời bình thật tương ứng, có fade
  in/out) + 3 file lời bình thật → xuất
  `Tu-lieu-clip/Cam-nang-An-toan-so_ban-nhap.mp4` (1920×1080, H.264/AAC, 1 phút 34 giây).
  Đây là **bản nháp**, không phải bản nộp thi cuối cùng.

## Còn thiếu để thành bản nộp thi chính thức

1. Cảnh 2, 3, 4 cần cảnh quay màn hình thật của site (hiện là đồ hoạ mô phỏng) — tự quay
   bằng OBS Studio/Windows Game Bar rồi ghép thay vào `build_video.sh`.
2. Chưa có nhạc nền/SFX (không có tư liệu nhạc bản quyền sẵn trong dự án).
3. Cảnh 1 và 5 kịch bản gốc yêu cầu ảnh/video thật (cán bộ thao tác, khuôn viên Học
   viện) — hiện dùng đồ hoạ thay thế.

## Tư liệu do người dùng tự bổ sung (chưa qua Claude xử lý)

Thư mục `Tu-lieu-clip/` hiện có thêm `Flows`, `ẢNH MÀN HÌNH`, `NGAN_DUONG_VUONG.mp4`,
`QR.mp4` — những file này được người dùng thêm trực tiếp, chưa được rà soát/tổng hợp vào
tài liệu này. Khi cần dùng tới, nhờ Claude đọc lại nội dung cụ thể trước khi ghép vào
video, đừng giả định nội dung dựa theo tên file.
