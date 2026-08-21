# Nhật ký thay đổi

> Ghi theo ngày, mới nhất lên đầu. Mục đích: biết nhanh "gần đây đã làm gì" mà không
> phải đọc lại toàn bộ lịch sử chat hay `git log`. Chi tiết kỹ thuật của từng tính
> năng nằm ở [PROJECT.md](PROJECT.md); sự cố vận hành ở [DEPLOYMENT.md](DEPLOYMENT.md).
>
> **Quy tắc**: mỗi khi hoàn thành một nhiệm vụ mới, thêm 1 mục vào đầu file này —
> không chờ gộp nhiều việc mới ghi.

## 2026-08-21 (tiếp 3)

- **Bỏ hẳn các ô placeholder icon** khi thẻ chưa có ảnh — thay vì hiện icon xám/khung
  giữ chỗ (nhìn như ảnh hỏng), giờ thẻ không có ảnh chỉ hiện chữ, không chiếm khoảng
  trống vô nghĩa. Áp dụng cho: thẻ "Bộ kỹ năng An toàn số" dạng link
  (`.skill-thumb-placeholder`), thẻ "Hoạt động" (`.activity-thumb-placeholder`), và
  khung "Ảnh minh chứng đang được cập nhật" trong panel chi tiết sự kiện
  (`.event-cover-placeholder`, dùng chung giữa Đồng thời gian và modal Hoạt động khác).
  Ảnh sẽ tự hiện lại bình thường khi nội dung có ảnh thật.
- **Rút gọn menu chính từ 9 xuống 7 mục**: giữ Trang chủ, Giới thiệu, Tuyên truyền,
  Chuyển đổi số, Nghiên cứu khoa học, Liên hệ hiện trực tiếp; gộp Đổi mới sáng tạo,
  Khác, Bộ kỹ năng An toàn số vào menu sổ xuống "Thêm" mới (`#nav-more`, giữ nguyên
  hành vi lọc hoạt động/điều hướng của từng mục). Tăng cỡ chữ menu (0.78rem → 0.92rem,
  đậm hơn) và thêm gạch phân cách mảnh giữa các mục cho đỡ rối mắt. Trên mobile (<940px)
  menu "Thêm" tự giãn phẳng vào danh sách dọc như các mục khác, không lồng dropdown.

## 2026-08-21 (tiếp 2)

- **Phát hiện lại**: 3 file lời bình (`Audio/1. Nam.mp3`, `2. Nữ.mp3`, `3. Nam.mp3`) thực ra
  khớp CHÍNH XÁC với lời bình 5 cảnh trong `Audio/Kịch bản.backup-20260819-222106.docx`
  (PHẦN II — Bảng phân cảnh dựng video, cuộc thi sản phẩm truyền thông số của Đảng bộ Học
  viện CSND) — không phải kịch bản quảng bá website riêng như nhận định trước đó (đã đính
  chính với người dùng). Audio 1 = lời bình Cảnh 1, Audio 2 = gộp liền Cảnh 2+3+4, Audio 3
  = lời bình Cảnh 5.
- **Cài `ffmpeg` (winget, Gyan.FFmpeg full build)** và **`eSpeak NG`** (cài xong nhưng không
  dùng tới) để có thể tự dựng/render video trong môi trường làm việc.
- **Dựng bản nháp hoàn chỉnh `Tu-lieu-clip/Cam-nang-An-toan-so_ban-nhap.mp4`** (1920x1080,
  H.264/AAC, 94,3 giây) theo đúng kịch bản 5 cảnh: 5 ảnh nền motion-graphic tự tạo bằng
  Pillow (`scripts/video/build_slides.py`, bám màu sắc/thương hiệu thật của site — đỏ
  #d62828, vàng #e8b923, nền kem #fdf8ec, dùng logo/huy hiệu thật trong `img/`) + lời bình
  thật ghép đúng thời lượng qua ffmpeg (`scripts/video/build_video.sh`). Do không lấy được
  ảnh chụp màn hình thật của site (giới hạn công cụ trình duyệt) nên hình ảnh là đồ họa mô
  phỏng giao diện, không phải screen-recording thật — cần thay bằng cảnh quay màn hình thật
  trước khi nộp dự thi chính thức. Chưa có nhạc nền/SFX (không có tư liệu âm thanh bản quyền).
  Phát hiện phụ: font "SVN-Arial"/"SVN-Segoe UI" trong `C:\Windows\Fonts` chèn watermark ẩn
  vào một số glyph khi render bằng Pillow — đã chuyển sang dùng font Windows chuẩn
  (`arial.ttf`, `arialbd.ttf`, `segoeuib.ttf`).

## 2026-08-21 (tiếp)

- **Dựng kịch bản edit video giới thiệu website** từ 3 file lời bình người dùng ghi âm
  (`Audio/1. Nam.mp3` 21,6s, `Audio/2. Nữ.mp3` 57,1s, `Audio/3. Nam.mp3` 15,7s — tổng
  1 phút 34 giây). Nội dung lời bình này quảng bá trực tiếp website (3 trụ cột, kho lưu
  trữ chiến dịch tuyên truyền) — khác kịch bản 5 cảnh "Cẩm nang An toàn số" trong file
  backup. Đã tạo `Tu-lieu-clip/Kich-ban-dung-video-gioi-thieu-website.docx`: timeline
  từng đoạn khớp lời bình, hình ảnh/cảnh quay màn hình đề xuất (bám theo đúng các mục đã
  có trên site: banner, Bộ kỹ năng An toàn số 2 nhóm, danh sách Hoạt động...), danh sách
  tư liệu cần quay riêng, gợi ý nhạc nền, và các bước lắp ráp thủ công. Không tự xuất
  được file video (.mp4) trong môi trường hiện tại — thiếu công cụ dựng/render video.

## 2026-08-21

- **Nhập dữ liệu từ `uploads/mau-nhap-hoat-dong-2.xlsx`** (28 dòng): đối chiếu thủ công
  từng dòng với 19 sự kiện đã đăng trước khi ghi — loại 1 dòng ví dụ hư cấu còn sót,
  bỏ qua 4 dòng trùng hoàn toàn (3 "Thiện nguyện" tên chung + 1 dòng Lào Cai trùng link
  với sự kiện đã có), **cập nhật thêm link/video tham khảo cho 6 sự kiện đã đăng nhưng
  trước đó thiếu link**, và **tạo mới 14 sự kiện thật chưa từng có** (các trường THCS/
  Tiểu học Marie Curie, Giảng Võ, Trung Tự, Đoàn Thị Điểm, Ngôi Sao Hà Nội... giai đoạn
  2021-2026). 1 dòng có link bị dán nhầm (không khớp chủ đề) đã bỏ link, giữ lại nội
  dung. Tổng số hoạt động: 19 → 58.
- **Tách "Bộ kỹ năng An toàn số" thành 2 nhóm riêng**: "Infographic kỹ năng" (7 ảnh) và
  "Bài viết tham khảo từ nguồn chính thống" (5 bài) — mỗi nhóm có tiêu đề phụ và lưới
  riêng (`#skills-grid-image` / `#skills-grid-link`), thay vì trộn chung 1 lưới.
  `loadSkills()` lọc theo `s.image` để phân nhóm.
- **Bài viết dạng link (không ảnh riêng) giờ mở thẳng tab mới** thay vì qua modal iframe
  — nhiều trang `.gov.vn` tự chặn nhúng bằng X-Frame-Options khiến modal trống/treo,
  tạo cảm giác web bị lỗi. Thẻ dạng này giờ là link `target="_blank"` thật, có gợi ý chữ
  "Xem bài viết (mở tab mới) ↗" trên thẻ.

## 2026-08-20 (tiếp 7)

- **Nạp 7 infographic "Bộ kỹ năng An toàn số"** người dùng cung cấp (Nhận diện lừa đảo
  số, Bảo vệ danh tính/dữ liệu cá nhân, Bảo vệ tài khoản/thiết bị, Giao dịch thanh toán
  an toàn, Mạng xã hội an toàn, Dùng AI an toàn, Ứng phó sự cố) vào `uploads/` +
  `content/ky-nang/*.json`.
- **Mở rộng schema `ky_nang` cho phép mục chỉ có link, không cần ảnh riêng** (`image`
  chuyển `required: false`, `build-skills.js` chỉ loại bỏ mục thiếu CẢ ảnh lẫn link) —
  áp dụng ngay để thêm 5 bài viết thật từ nguồn chính thống (Bộ Công an, Bộ Khoa học và
  Công nghệ, Công an tỉnh Ninh Bình) về deepfake, lừa đảo trực tuyến, bảo vệ dữ liệu cá
  nhân — hiển thị bằng khung giữ chỗ + link thay vì ảnh.
- Sửa `loadSkills()` trong `main.js`: xử lý đúng trường hợp không có ảnh (khung giữ chỗ
  thay vì `<img src="">` rỗng — lỗi phổ biến khiến trình duyệt gửi request rỗng về
  chính trang).

## 2026-08-20 (tiếp 6)

- **Sửa lỗi CSP có thể chặn ảnh feed hoạt động**: `img-src` trong CSP trang public chưa
  có `https://cdn.hvcsnd.edu.vn` (nguồn ảnh của feed hoạt động tự động thêm ở mục
  "tiếp 3") — đã bổ sung để đảm bảo ảnh luôn tải được trên bản live.
- **Thêm 4 thẻ phân loại (Chuyển đổi số/Đổi mới sáng tạo/Nghiên cứu khoa học/Khác) trực
  tiếp lên thanh điều hướng** — bấm vào sẽ cuộn tới mục "Hoạt động khác" VÀ tự áp dụng
  đúng bộ lọc đó luôn (`applyActivityFilter()` dùng chung giữa pill lọc và link menu).
- **Thêm tính năng "Bộ kỹ năng An toàn số"** (`#ky-nang-section`): lưới ảnh/infographic
  về thủ đoạn lừa đảo + cách phòng ngừa, bấm ảnh xem cỡ lớn (dùng lại lightbox có sẵn).
  Collection CMS mới `ky_nang` → `content/ky-nang/*.json` → `scripts/build-skills.js` →
  `data/skills.json`, thêm vào chuỗi build trong `netlify.toml`. **Cố ý để trống, không
  tự động lấy ảnh từ nguồn ngoài** — infographic là tác phẩm đồ hoạ hoàn chỉnh, rủi ro
  bản quyền cao hơn nhiều so với headline+link tin tức, nên chờ admin tự tải ảnh do đơn
  vị làm/có bản quyền qua `/admin`.
- **Sửa tràn thanh điều hướng** khi tăng từ 5 lên 9 mục: nhãn dài (vd "Nghiên cứu khoa
  học", "Bộ kỹ năng An toàn số") khiến từng mục tự xuống dòng ngay cả ở đúng 960px
  (`--max-width` của toàn trang) vì thiếu `white-space: nowrap`. Đã thêm `nowrap`, giảm
  `gap` (22px→6px) và cỡ chữ (0.92rem→0.78rem) cho khớp menu, thu nhỏ nút theme/quản trị
  (34px→30px), và tách riêng ngưỡng chuyển sang menu rút gọn (hamburger) cho phần nav
  lên 940px (các quy tắc responsive khác không liên quan menu vẫn giữ ngưỡng 640/720px
  cũ) — đã đo thực tế bằng `getBoundingClientRect()` ở nhiều mốc rộng màn hình để xác
  nhận không còn tràn/xuống dòng lệch nhau.

## 2026-08-20 (tiếp 5)

- **Làm lại header thành 2 hàng theo kiểu báo điện tử** (tham khảo Công an nhân dân):
  hàng 1 là logo + tên thương hiệu "Cẩm nang - An toàn số" căn giữa, riêng 1 khung
  (`.header-brand-row`); hàng 2 là thanh điều hướng nền đỏ accent, riêng 1 khung
  (`.header-nav-row`, `.header-nav-inner`). Đổi `--header-h` (64px) thành 2 biến
  `--header-brand-h` (78px) + `--header-h` (56px, giờ chỉ còn là chiều cao hàng nav) để
  tính đúng vị trí menu sổ xuống trên mobile (`top: calc(brand-h + nav-h)`).
  Đổi màu chữ menu/nút theme/nút quản trị sang `--on-accent` (trắng ngà) vì giờ nằm
  trên nền đỏ đặc thay vì nền mờ như trước; ô "Quản trị"/"Đổi mật khẩu" sổ xuống vẫn giữ
  màu chữ thường (`--text`) vì bản thân khung đó có nền card riêng, không phải nền đỏ.
- **Logo sáng hơn**: thêm `filter: brightness(1.18) saturate(1.12) contrast(1.04)` cho
  ảnh huy hiệu ở header (chỉ ở header, không đụng logo ở Hero) để dễ nhận diện hơn trên
  nền màu.

## 2026-08-20 (tiếp 4)

- **Sửa lỗi banner trang chủ bị 25 tin tự động chiếm hết**: ảnh của các tin trong feed
  hoạt động tự động (mục "tiếp 3" bên dưới) bị đánh dấu `featured: true`, vô tình bị
  gộp luôn vào banner trang chủ (vốn chỉ dành cho ảnh admin chủ động chọn qua "Ảnh đại
  diện nổi bật"). Đổi thành `featured: false` — ảnh feed vẫn hiện trên thẻ hoạt động
  của chính nó (không cần `featured`), chỉ không còn vào banner.
- **Thêm dự phòng khi ảnh lỗi** (banner + thẻ hoạt động): vì ảnh feed lấy trực tiếp từ
  CDN ngoài (`cdn.hvcsnd.edu.vn`), nếu 1 ảnh nào đó tải lỗi thì tự ẩn/thay khung giữ chỗ
  thay vì hiện chữ thay thế (alt text) trông như link vỡ giữa banner.

## 2026-08-20 (tiếp 3)

- **Sửa lỗi nghiêm trọng, tồn tại từ lâu**: script chọn giao diện sáng/tối lúc tải trang
  nằm dưới dạng `<script>` inline trong `<head>` — nhưng CSP công khai
  (`script-src 'self' https://gc.zgo.at`) **không có `'unsafe-inline'`**, nên trình
  duyệt âm thầm chặn không cho chạy (không log lỗi rõ ràng ra console). Hệ quả: tính
  năng "tự chọn sáng 6h-12h, tối ngoài giờ đó" **chưa từng thực sự hoạt động trên bản
  live** suốt thời gian qua — trang luôn hiển thị theo CSS mặc định (tối), bất kể giờ
  hay lựa chọn mặc định mới đặt sáng. Đã sửa bằng cách chuyển đoạn script này ra file
  riêng `js/theme-init.js` (script từ file ngoài luôn được `'self'` cho phép). Xác nhận
  qua `curl` trực tiếp cả server local lẫn bản live (không dùng Browser pane vì công cụ
  này gặp trục trặc hiển thị khi kiểm tra).
- **Sửa lỗi nút lọc phân loại trong "Hoạt động khác" không có tác dụng**: CSS ẩn thẻ bị
  lọc nhắm nhầm class `.event-card.filtered-out`, trong khi thẻ thật có class
  `.activity-card` — nút bấm đổi đúng trạng thái nhưng không thẻ nào bị ẩn/hiện. Sửa
  lại đúng class `.activity-card.filtered-out`.
- **Thêm feed hoạt động tự động** cho 3 danh mục "Chuyển đổi số", "Đổi mới sáng tạo",
  "Nghiên cứu khoa học" (tối đa 9 tin/danh mục) — quét trực tiếp trang "tag" tương ứng
  trên hvcsnd.edu.vn (Học viện CSND không có RSS công khai, xem `build-ticker.js`) ngay
  trong `build-events.js`, chạy lại ở MỌI lần build nên tự cập nhật theo đúng trang chủ
  Học viện, không cần thao tác gì thêm. Lấy cả ảnh đại diện thật từ CDN chính thức của
  Học viện (`cdn.hvcsnd.edu.vn`) thay vì khung giữ chỗ. Danh mục "Khác" không có tag
  tương ứng trên hvcsnd.edu.vn nên vẫn dựa vào nội dung nhập tay/qua Excel.
- Sửa lỗi so sánh ngày không ổn định khi 2 hoạt động cùng ngày (comparator sort trả về
  `-1` thay vì `0` khi bằng nhau, phá vỡ tính ổn định của sort).

## 2026-08-20 (tiếp 2)

- Đổi giao diện mặc định thành **sáng** cho mọi người xem lần đầu (trước đây tự chọn
  theo giờ trong ngày) — ai muốn tối vẫn tự bấm nút chuyển đổi như cũ, lựa chọn đó được
  nhớ lại cho các lần sau.
- Xác nhận nguyên nhân ô "Lượt truy cập" không tăng dù bấm link nhiều lần: endpoint
  `/counter/TOTAL.json` của GoatCounter **cache tới 4 giờ** theo đúng thiết kế của họ,
  không phải lỗi — số liệu thật vẫn được ghi nhận, chỉ hiển thị trễ.
- **Lấp đầy 4 tab phân loại từng trống** ("Chuyển đổi số", "Đổi mới sáng tạo", "Nghiên
  cứu khoa học", bổ sung thêm "Khác") bằng 8 hoạt động thật, lấy từ đúng trang chính
  thống hvcsnd.edu.vn (Học viện CSND) — 3 trong số đó hoàn thiện từ chính các dòng link
  người dùng đã dán sẵn trong file Excel nhưng chưa kịp điền tiêu đề/ngày. Tóm tắt viết
  lại bằng lời văn riêng (không sao chép nguyên văn bài gốc).

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
