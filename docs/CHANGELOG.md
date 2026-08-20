# Nhật ký thay đổi

> Ghi theo ngày, mới nhất lên đầu. Mục đích: biết nhanh "gần đây đã làm gì" mà không
> phải đọc lại toàn bộ lịch sử chat hay `git log`. Chi tiết kỹ thuật của từng tính
> năng nằm ở [PROJECT.md](PROJECT.md); sự cố vận hành ở [DEPLOYMENT.md](DEPLOYMENT.md).
>
> **Quy tắc**: mỗi khi hoàn thành một nhiệm vụ mới, thêm 1 mục vào đầu file này —
> không chờ gộp nhiều việc mới ghi.

## 2026-08-20 (tiếp)

- **Nhập 10 hoạt động thật** (2022-2024, tuyên truyền pháp luật/an ninh mạng tại các
  trường THPT/THCS, có số kế hoạch chính thức) từ file Excel người dùng gửi trực tiếp
  qua chat — dùng `import-events-xlsx.js` để chốt thành file riêng trong
  `content/events/`. Đã loại bỏ 1 dòng ví dụ hư cấu (do Claude tạo trước đó, có link
  YouTube rickroll) còn sót lại trong file trước khi nhập — không xuất bản nội dung
  không có thật.
- Thêm trường **"Số kế hoạch"** (`planNumber`) xuyên suốt: cột mới trong file mẫu Excel,
  field trong `admin/config.yml` (cả sự kiện đơn lẻ lẫn nhập hàng loạt), hiển thị trong
  chi tiết sự kiện trên trang (`.event-plan-number`).
- **Thêm nút tải file Excel lên qua `/admin`** ("Nhập hàng loạt (Excel)") — giải quyết
  yêu cầu "không có nút nào để đính kèm file" khi nhìn màn hình `/admin` trước đó.
  `scripts/build-events.js` tự đọc lại file đã tải lên (qua con trỏ
  `content/nhap-hang-loat.json`) ở MỌI lần build, ghép trực tiếp vào `data/events.json`,
  tự tìm ảnh khớp mã trong `uploads/` mỗi lần build — đúng yêu cầu "ảnh thả vào sau, web
  tự tìm". Đánh đổi: đây là dữ liệu "sống" theo file đang trỏ tới (build không ghi
  ngược lại được vào Git), nên chỉ nên xử lý 1 lô tại 1 thời điểm, cần "chốt" (ghi
  thành file riêng vĩnh viễn) trước khi tải lô mới — xem docs/PROJECT.md mục
  "Nhập hàng loạt".
- **Sửa lỗi trùng mã ảnh giữa các lần nhập khác nhau**: đổi công thức "mã sự kiện" từ
  chỉ dùng STT (reset về 1 mỗi lần điền file mới, dễ trùng) sang
  `<Ngày dạng YYYYMMDD>-<STT>` — STT lặp lại giữa các đợt nhập không còn gây trùng mã vì
  Ngày hầu như luôn khác nhau. Tách logic đọc `.xlsx` dùng chung vào
  `scripts/lib/xlsx-events.js` (dùng ở cả 2 đường nhập, tại máy lẫn qua web).
- Sửa `import-events-xlsx.js`: không đổi tên ảnh khi copy nữa (giữ nguyên tên gốc theo
  đúng quy ước `<mã>-<số ảnh>.jpg` người dùng đã đặt sẵn), thống nhất với cách web-upload
  xác định ảnh (cùng dùng đúng tên file, không phát sinh 2 quy tắc đặt tên khác nhau).

## 2026-08-20

- Thêm công cụ **nhập hàng loạt sự kiện** (`scripts/import-events-xlsx.js`, bấm đúp
  `Nhap-hang-loat.bat`): đọc `uploads/mau-nhap-hoat-dong.xlsx` (đã dọn sạch dòng ví dụ
  bị trùng STT với dòng mẫu trống — lỗi có sẵn từ trước) + ảnh trong thư mục mới
  `Anh-nhap-hoat-dong/` (quy ước tên `<STT>-<số ảnh>.jpg`, có hướng dẫn chi tiết trong
  `HUONG-DAN-DAT-TEN-ANH.txt` ngay trong thư mục đó, script tự tạo lại nếu mất). Tự viết
  bộ đọc ZIP/XML cho `.xlsx` bằng Node core, không cài thêm thư viện nào — giữ đúng
  nguyên tắc "không cần npm install" của dự án. Mục đích: N sự kiện nhập 1 lần + 1 lần
  push = 15 credit Netlify, thay vì N lần lưu qua `/admin` = 15×N credit. Đã test đủ các
  ca: ảnh nhiều tấm, thiếu ảnh, sai định dạng ngày, phân loại không khớp, dòng trống.
- Nâng cấp Netlify lên gói **Personal ($9/tháng, 1.000 credit/tháng)** — giải quyết việc
  hết credit gói Free. Push đầu tiên sau nâng cấp build/deploy thành công trong 9 giây.
- Xác nhận công thức credit chính xác từ docs Netlify: **1 lần production deploy (push
  code hoặc admin Lưu trong `/admin`) = 15 credit cố định**, không phụ thuộc thời lượng
  build; traffic thật tính riêng (2 credit/10k request, 20 credit/GB băng thông).
- Bật công khai số liệu **GoatCounter** (site `vuongnq`, tick "Allow adding visitor
  counts on your website" trong Settings) — ô "Lượt truy cập" trên trang giờ hiện số
  thật thay vì "—". Không tốn credit Netlify (chỉ là cấu hình phía GoatCounter).
- Thêm mục "Quy tắc duy trì credit" vào `docs/DEPLOYMENT.md`: gộp thay đổi trước khi
  Lưu/push, ưu tiên nhập hàng loạt qua Excel thay vì từng bài qua `/admin`, kiểm tra số
  dư định kỳ, theo dõi traffic qua GoatCounter — mục tiêu duy trì gói Personal trong
  ngân sách 1.000 credit/tháng mà không cần bật Auto recharge.

## 2026-08-19

- Đổi nhãn "THỜI SỰ" trong dải tin từ khối nền vàng đặc (chữ tối trên nền vàng — độ
  tương phản kém ở theme sáng) sang dạng viền nhạt/nền trong suốt, chữ trắng — theo
  yêu cầu người dùng khi so với ảnh chụp giao diện thực tế.
- Chuyển dải tin chạy xuống **ngay dưới header** (trước đây nằm trên header) và thêm
  **thanh thời tiết + đồng hồ trực tiếp** vào đầu dải tin (Hà Nội, nhiệt độ thực qua
  Open-Meteo API — không cần key, cập nhật lại mỗi 15 phút; ngày/giờ theo múi giờ
  Asia/Ho_Chi_Minh, cập nhật mỗi giây), theo bố cục tham khảo từ cổng thông tin Bộ Công
  an. Thêm `https://api.open-meteo.com` vào CSP `connect-src` của trang public
  (`netlify.toml`). Trên mobile ẩn bớt phần ngày/giờ để tránh tràn dòng.
- Cập nhật `Kịch bản.docx` (kịch bản dự thi) theo yêu cầu: thêm **Cảnh 1 mới** (0:00–0:15,
  15 giây) cho Trưởng nhóm (Thượng tá Phạm Thị Ngân) quay đoạn tự giới thiệu on-camera; các
  cảnh cũ dời thành Cảnh 2→6, cắt cảnh mở đầu cũ (nay là Cảnh 2) từ 25s→20s để giữ tổng thời
  lượng 02 phút 55 giây (dưới mức trần 03 phút). Bổ sung vào Visual của Cảnh 3/4/5 các tính
  năng web mới trong phiên này (dải tin chạy, nút sáng/tối, cụm widget góc, Thư viện ảnh &
  video, giao diện chi tiết sự kiện ảnh bìa lớn). Cập nhật PHẦN I (thời lượng) và PHẦN III
  Giai đoạn 2 (thêm mục quay đoạn giới thiệu). Sửa trực tiếp bằng chỉnh sửa XML (giữ nguyên
  100% `tcPr`/`rPr` — không đổi font/cỡ chữ/thể thức Nghị định 30 đã có), có backup
  `Kịch bản.backup-<timestamp>.docx` trước khi ghi đè, đã qua kiểm tra `validate.py` (XSD +
  so sánh với bản gốc) PASSED.
- Gộp `README.md` (đã cũ, trùng nhiều với `docs/`) — README giờ chỉ còn phần thiết
  lập ban đầu (1 lần) + hướng dẫn thêm nội dung khi offline (`add-event.js`/
  `Them-su-kien.bat`), phần kiến trúc/tính năng trỏ sang `docs/PROJECT.md`.
- Tạo thư mục `docs/` (file này + PROJECT.md + DEPLOYMENT.md) để CLAUDE mới vào phiên
  chat có thể nắm nhanh trạng thái dự án, tiết kiệm token so với đọc lại toàn bộ code.
- Phát hiện + xác nhận Netlify hết credit build tháng này (chu kỳ 18/8–17/9), mọi
  deploy production (kể cả CLI thủ công) đều bị chặn tới 17/9 hoặc khi nâng cấp gói.
  Đã thử và loại trừ hướng "tạo tài khoản Netlify mới" (rủi ro cấu hình lại
  Identity/DNS) và "deploy CLI vòng qua" (bị chặn y hệt, xác nhận bằng thực nghiệm).
- Mở rộng khung đoạn mô tả Hero (520px→680px) + bật `white-space: pre-line` để admin
  tự ngắt dòng chủ động trong CMS thay vì để trình duyệt tự ngắt.
- Cập nhật logo header/hero/favicon theo bản `logo 01.png` mới (đổi dòng chữ vành
  dưới thành "KHOA KTT - TO2").
- Hiện lại hàng số liệu (Hoạt động/Thư viện/Cập nhật/Lượt truy cập) ở **cả 2 nơi**:
  dưới nút "Xem Cẩm nang" và trong panel góc — chuyển từ id sang class dùng chung
  (`.js-stat-*`) để cập nhật đồng thời nhiều vị trí.
- Làm lại giao diện chi tiết sự kiện: ảnh/video đầu tiên lên làm ảnh bìa lớn đầu bài,
  ảnh còn lại xếp dải dưới thân bài, thêm khung giữ chỗ khi chưa có ảnh/video.
- Cho phép upload nhiều ảnh cùng lúc trong CMS (đổi field `images` sang dạng rút gọn
  `field:`), tách "Ảnh đại diện nổi bật" (banner) thành field riêng thay vì checkbox
  trên từng ảnh.
- **Sửa lỗi nghiêm trọng**: upload ảnh trong CMS báo `"Failed to persist entry:
  TypeError: Failed to fetch"`. Nguyên nhân thật: CSP `/admin` thiếu `blob:` trong
  `connect-src` (Decap CMS cần `fetch()` vào URL `blob:` khi đọc file ảnh để upload).
  Đã sửa, xác nhận hoạt động qua ảnh thật do người dùng tải lên thành công.
- CMS hoá toàn bộ nội dung chữ tĩnh còn lại: header (tên thương hiệu, nhãn menu),
  Hero (tiêu đề/mô tả/nút), tiêu đề 2 mục Tuyên truyền/Hoạt động khác, footer — qua
  collection mới "Nội dung chung trang web" (`content/site.json`).
- Đổi viền các khung ở mục Giới thiệu từ đỏ sang vàng (hợp nền tối hơn), tăng độ
  tương phản chữ phụ (`--text-dim`) cả 2 theme, tăng cỡ chữ gốc toàn site +12.5%.
- Làm lại chữ thương hiệu ở header: gộp 1 dòng, in đậm, phần "An toàn số" màu vàng.
- Làm lại layout mục Giới thiệu theo mẫu người dùng cung cấp: lưới 2 cột (đoạn giới
  thiệu + 2 thẻ chỉ đạo), hàng 3 thẻ điểm nổi bật, khối căn cứ thực hiện — tất cả có
  viền, chữ căn đều 2 bên. CMS hoá toàn bộ qua `content/gioi-thieu.json`.
- Thêm widget góc phải dưới (3 nút nổi): số liệu nổi bật, tin thời sự liên quan, hòm
  thư góp ý (Netlify Forms).
- Thêm dải tin chạy đầu trang, lấy tin thật từ 2 RSS Bộ Công an đã xác minh hoạt động
  + tin admin tự thêm qua CMS. Tốc độ chạy chỉnh chậm lại theo yêu cầu (55s→220s/vòng).
- Sửa lỗi đo bề rộng logo Hero: dùng `Range` trên text node thay vì
  `getBoundingClientRect()` trên `<h1>` (h1 là block nên trả về bề rộng container
  chứ không phải bề rộng chữ thật — khiến logo bị phóng quá to).
- Thêm chế độ sáng/tối tự động theo giờ (6h-12h = sáng, còn lại = tối), ưu tiên lựa
  chọn thủ công nếu người dùng từng bấm nút chuyển đổi.
- Sửa lỗi bấm "Trang chủ" bị cuộn khuất mất dải tin chạy (dải tin nằm trên header
  sticky, không sticky theo) — giờ bấm sẽ cuộn thẳng lên đỉnh trang.

## 2026-08-18

- Sửa file `Kịch bản.docx` (kịch bản dự thi) theo thể thức Nghị định 30: khối quốc
  hiệu/tiêu ngữ dạng bảng 2 cột, căn giữa tiêu đề, định dạng lại bảng phân cảnh (bỏ
  kiểu Google Docs, đổi viền vàng/xám sang chuẩn), sửa nội dung theo 3 điểm đã thống
  nhất. Phát hiện + sửa lỗi lệch cột trong bảng phân cảnh gốc (dữ liệu Cảnh 2-5 bị
  dồn sai cột, thiếu hẳn cột Âm thanh/Hiệu ứng).
- Đổi thương hiệu site từ "Hồ sơ tuyên truyền An ninh mạng" → "Cẩm nang An toàn số".
- Đổi giao diện màu chủ đạo từ xanh lá sang đỏ-vàng (Phương án B).
- Tách layout: Tuyên truyền An ninh mạng giữ dạng dòng thời gian, các mảng khác
  (Chuyển đổi số/Đổi mới sáng tạo/...) chuyển sang lưới thẻ kiểu tạp chí.
- Thêm huy hiệu Đảng + Công an vào mục Giới thiệu.

## Trước 2026-08-18

Khởi tạo website: timeline tuyên truyền An ninh mạng, hệ thống nhãn phân loại hoạt
động, Decap CMS cơ bản (collection "events"), field nhúng video YouTube/Google Drive,
GoatCounter (tắt mặc định, cần tự bật). Xem `README.md` ở thư mục gốc cho hướng dẫn
cài đặt ban đầu (đã cũ một phần — ưu tiên đọc `docs/` cho thông tin mới nhất).
