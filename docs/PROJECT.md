# Cẩm nang An toàn số — tổng quan dự án

> Đọc file này trước tiên trong mọi phiên chat mới. Đây là bản đồ hệ thống, không phải
> hướng dẫn cài đặt (xem [DEPLOYMENT.md](DEPLOYMENT.md) cho phần đó) và không phải
> nhật ký thay đổi (xem [CHANGELOG.md](CHANGELOG.md)).

## Site là gì

Website tuyên truyền an ninh mạng / chuyển đổi số của Khoa Toán - Tin học và Ứng dụng
KHCN, Học viện CSND. Live tại **https://tuyentruyen.khoaktt.vn/**, quản trị nội dung tại
**`/admin`** (Decap CMS). Đây là sản phẩm dự thi "Sáng tạo sản phẩm truyền thông số" của
Đảng ủy Học viện CSND.

## Ngăn xếp công nghệ

- **Jamstack tĩnh thuần**: HTML/CSS/JS, không framework, không build tool (Vite/Webpack/...).
- **Decap CMS** (`/admin`) + **Netlify Identity** (đăng nhập) + **Git Gateway** (Decap
  commit thẳng vào GitHub thay vì cần token cá nhân).
- **Netlify**: hosting + build (chạy các script Node trong `scripts/`) + Identity/Git
  Gateway backend.
- Không database, không API tự viết, không server-side code nào khác ngoài các script
  build chạy 1 lần lúc deploy.

## Luồng dữ liệu (quan trọng nhất cần hiểu)

```
content/*.json, content/events/*.json   (nguồn — Decap CMS ghi vào đây qua Git Gateway)
        │
        ▼  scripts/build-*.js  (chạy lúc Netlify build, xem netlify.toml)
        │
data/*.json   (đã gitignore — sinh ra lúc build, không commit)
        │
        ▼  js/main.js fetch() lúc trang load
        │
DOM (index.html render động qua JS)
```

4 cặp nguồn/script/output tương ứng:

| Nguồn CMS | Script build | Output | Dùng cho |
|---|---|---|---|
| `content/events/*.json` (1 file/sự kiện) | `scripts/build-events.js` | `data/events.json` | Timeline "Tuyên truyền An ninh mạng" + lưới "Hoạt động khác" |
| `content/site.json` (1 file) | `scripts/build-site.js` | `data/site.json` | Header, Hero, tiêu đề 2 mục, Footer |
| `content/gioi-thieu.json` (1 file) | `scripts/build-about.js` | `data/about.json` | Mục "Giới thiệu" |
| — (RSS ngoài + `content/ticker/*.json` tuỳ chọn) | `scripts/build-ticker.js` | `data/ticker.json` | Dải tin chạy đầu trang |

**Nếu sửa code mà không thấy hiệu lực khi test local**: luôn chạy lại
`node scripts/build-events.js && node scripts/build-ticker.js && node scripts/build-about.js
&& node scripts/build-site.js` trước khi mở server — `data/*.json` không tự sinh.

## Cấu trúc thư mục

```
index.html          Toàn bộ trang public — hầu hết nội dung chữ là <span id="..."> RỖNG
                     hoặc có sẵn text mặc định, được main.js ghi đè bằng data/*.json.
                     Giữ text mặc định trong HTML để không bị trắng trang (FOUC) nếu
                     fetch lỗi hoặc JS chạy chậm.
css/style.css        1 file duy nhất. Theme sáng/tối qua CSS custom properties ở :root
                     và :root[data-theme="light"] — xem "Theme sáng/tối" bên dưới.
js/main.js            Toàn bộ JS, không module bundler, load bằng <script defer>.
admin/config.yml      Schema Decap CMS — 4 collection: site, gioi_thieu, events, ticker.
admin/index.html      Bootstrap Decap CMS + Netlify Identity widget.
content/              Nguồn dữ liệu CMS (commit vào Git, KHÔNG gitignore).
data/                 Output build (gitignore, không commit — build lại mỗi lần).
scripts/build-*.js    4 script build, chỉ dùng Node core (fs, path, fetch) — không
                       cần npm install, không có package.json trong repo.
scripts/add-event.js  CLI thêm 1 sự kiện thủ công khi test local (không qua CMS).
scripts/import-events-xlsx.js  Nhập hàng loạt sự kiện từ
                       uploads/mau-nhap-hoat-dong.xlsx + ảnh từ Anh-nhap-hoat-dong/ —
                       tự viết ZIP/XML reader, không dùng thư viện xlsx ngoài (giữ đúng
                       nguyên tắc "chỉ Node core"). Xem mục "Nhập hàng loạt" bên dưới.
img/                  Ảnh tĩnh (logo, favicon, og-image) — commit vào Git.
uploads/              Ảnh do CMS/Decap tải lên qua Git Gateway — commit vào Git. Cũng
                       chứa mau-nhap-hoat-dong.xlsx (mẫu Excel nhập hàng loạt).
Anh-nhap-hoat-dong/    Thư mục thả ảnh trước khi nhập hàng loạt — gitignore (ảnh gốc
                       chưa xử lý không lên Git, chỉ bản đã copy/đổi tên trong uploads/
                       mới commit). Tự động rỗng lại sau mỗi lần chạy import.
logo/, Thư viện/       Nguồn ảnh gốc (PSD/PNG lớn) để xử lý ra img/ — gitignore, KHÔNG
                       lên GitHub (chỉ tồn tại trên máy local của người dùng).
netlify.toml           Build command + Content-Security-Policy headers. Xem
                        DEPLOYMENT.md để hiểu từng dòng CSP vì sao cần thiết.
```

## Các tính năng chính (map nhanh tới code)

- **Theme sáng/tối**: script inline đầu `<head>` trong `index.html` set
  `data-theme="light"` dựa trên `localStorage.theme` (nếu người dùng từng bấm nút) hoặc
  giờ hiện tại (6h–12h = sáng, còn lại = tối). Nút bấm: `#theme-toggle`,
  logic ở `setupThemeToggle()` trong `main.js`.
- **Dải tin chạy đầu trang ("Thời sự")**: `#news-ticker`, populate bởi `loadTicker()`.
  Nguồn: 2 feed RSS thật của Bộ Công an (`bocongan.gov.vn/api/rss/35.xml` và `/36.xml`,
  đã xác minh hoạt động) + `content/ticker/*.json` do admin tự thêm thủ công (mục
  "Tin liên quan" trong `/admin`). Ưu tiên tin khớp từ khoá (chuyển đổi số, Nghị quyết
  57, an ninh mạng...). Xem `scripts/build-ticker.js`.
- **Widget góc phải dưới** (`#corner-widgets`): 3 nút tròn nổi — 📊 số liệu nổi bật
  (`#stats-panel`), 📰 tin liên quan (`#news-panel`), ✉️ hòm thư góp ý
  (`#feedback-panel`, form gửi qua **Netlify Forms**, không cần backend riêng).
- **Số liệu nổi bật** (Hoạt động / Thư viện ảnh & video / Cập nhật gần nhất / Lượt
  truy cập): hiển thị **2 nơi cùng lúc** — hàng ngang dưới nút "Xem Cẩm nang"
  (`.stats-row`) VÀ trong panel góc (`#stats-panel`) — dùng chung class
  `.js-stat-events`/`.js-stat-images`/`.js-stat-updated`/`.js-stat-visits` để
  `renderStats()`/`loadVisitCounter()` cập nhật đồng thời cả 2 nơi bằng
  `document.querySelectorAll`, không dùng id (id chỉ lấy được phần tử đầu tiên).
- **Lượt truy cập**: GoatCounter (site code `vuongnq`), script đếm luôn bật trong
  `index.html`. Ô hiển thị fetch `https://vuongnq.goatcounter.com/counter/TOTAL.json`
  — API này **yêu cầu bật "Allow using the visitor counter"** trong Settings của
  GoatCounter, nếu chưa bật sẽ trả 403 và ô hiển thị giữ nguyên dấu "—" (không lỗi gì,
  chỉ là chưa có số).
- **Thư viện ảnh & video** (modal `#media-library-modal`): gộp toàn bộ ảnh + video từ
  mọi sự kiện, mở bằng cách bấm ô "Thư viện ảnh & video" (class `.js-stat-media-tile`,
  có ở cả 2 vị trí nói trên). Ảnh → lightbox; video → mở modal chi tiết sự kiện đó.
- **Chi tiết sự kiện khi bấm vào 1 mốc/thẻ**: `buildDetailFragment()` trong `main.js`.
  Thứ tự hiển thị: video nhúng (nếu có) HOẶC ảnh đầu tiên làm ảnh bìa lớn HOẶC khung giữ
  chỗ (nếu chưa có gì) → link video/tham khảo dạng chữ → nội dung tóm tắt → dải ảnh còn
  lại (nếu có nhiều hơn 1 ảnh).
- **Upload nhiều ảnh cùng lúc**: field `images` trong `admin/config.yml` dùng dạng rút
  gọn `field:` (số ít, không phải `fields:`) — đây là cú pháp Decap CMS bắt buộc để
  bật chọn/kéo-thả nhiều file 1 lần. Ảnh đại diện cho banner trang chủ tách thành field
  riêng `featuredImage` (1 ảnh), không còn checkbox "featured" trên từng ảnh trong danh
  sách (vì không đánh dấu riêng lẻ được khi chọn nhiều file cùng lúc).
- **Banner trang chủ**: gom tất cả `featuredImage` của mọi sự kiện, tự trượt.
- **Logo**: `img/badge.png` (huy hiệu tròn, dùng ở header + hero + favicon) và
  `img/favicon.png` — sinh ra bằng cách crop/resize từ file gốc trong `logo/` (không
  commit). Chiều rộng logo ở Hero **tự đo bằng JS** (`syncHeroIconWidth()`) để luôn
  bằng đúng chiều rộng chữ tiêu đề "Cẩm nang An toàn số" bên dưới — lưu ý: đo bằng
  `Range` trên text node, KHÔNG dùng `getBoundingClientRect()` trên `<h1>` (vì h1 là
  block, sẽ trả về bề rộng cả container thay vì bề rộng chữ thật — đã từng bug chỗ này).
- **Đoạn mô tả Hero xuống dòng chủ động**: `#hero-subtitle` có CSS
  `white-space: pre-line` — Enter trong ô "Đoạn mô tả" ở `/admin` sẽ xuống dòng đúng
  vị trí đó trên trang, không phụ thuộc trình duyệt tự ngắt.
- **CMS hoá gần như toàn bộ chữ tĩnh**: header, hero, tiêu đề 2 mục Tuyên truyền/Hoạt
  động khác, footer đều sửa được qua `/admin` → "Nội dung chung trang web". Nhãn các
  nút/panel nhỏ (Thời sự, Số liệu nổi bật, Hòm thư góp ý...) vẫn cố định trong code
  (chưa CMS hoá, coi là "UI chrome" chứ không phải nội dung).

- **Xem link tham khảo ngay trong trang**: bấm "Xem bài viết tham khảo" mở modal
  `<iframe>` nhúng trang đó, không rời trang. Nhiều trang (Facebook, báo điện tử...)
  tự chặn nhúng bằng `X-Frame-Options`/`frame-ancestors` — đây là bảo mật của chính
  trang đó, modal sẽ trống/lỗi, không có cách "vượt qua" (và không nên). Nút "Mở tab
  mới ↗" ở góc modal là lối thoát cho trường hợp này.
- **Offline / chưa deploy**: `/admin` cần Netlify Identity thật nên không chạy được ở
  local. Thêm nội dung khi không có mạng: `scripts/add-event.js` (bấm đúp
  `Them-su-kien.bat`) — CLI hỏi từng bước, ghi thẳng vào `content/events/*.json` và
  tự chạy lại `build-events.js`. Xem [README.md](../README.md) mục "Thêm nội dung khi
  offline".
- **Nhập hàng loạt sự kiện (tiết kiệm credit Netlify)**: `scripts/import-events-xlsx.js`
  (bấm đúp `Nhap-hang-loat.bat`) đọc `uploads/mau-nhap-hoat-dong.xlsx` (mỗi dòng 1 sự
  kiện, cột đầu "STT" là mã sự kiện) + ảnh trong `Anh-nhap-hoat-dong/` (quy ước tên file
  `<STT>-<số ảnh>.jpg`, ảnh số 1 = ảnh đại diện) → tạo hàng loạt `content/events/*.json`
  cùng lúc, copy/đổi tên ảnh vào `uploads/`, ảnh gốc trong thư mục thả ảnh tự mất sau khi
  nhập (đã "tiêu thụ"). Lý do tồn tại: 1 lần push cho N sự kiện = 15 credit, thay vì N
  lần lưu qua `/admin` = 15×N credit (xem bảng giá credit trong
  [DEPLOYMENT.md](DEPLOYMENT.md)). Đọc trực tiếp cấu trúc ZIP/XML của `.xlsx` bằng tay
  (không dùng thư viện `xlsx` ngoài) để giữ đúng nguyên tắc "chỉ Node core, không cần
  npm install" của toàn bộ `scripts/`. Hướng dẫn đặt tên ảnh đầy đủ nằm sẵn trong
  `Anh-nhap-hoat-dong/HUONG-DAN-DAT-TEN-ANH.txt` (script tự tạo lại file này nếu bị xoá
  mất hoặc clone repo lần đầu).

## Việc CHƯA CMS hoá (nếu được yêu cầu làm tiếp)

Nhãn UI chrome (tên các nút/panel/modal), meta SEO (title/description trong `<head>`).

## Quy ước code quan trọng

- **Không dùng `id` để cập nhật phần tử có thể xuất hiện >1 lần trên trang** (bài học
  từ bug hàng số liệu) — dùng class + `querySelectorAll`.
- **Luôn escape/whitelist nội dung từ CMS** trước khi `innerHTML` (xem
  `markdownToHtml()`/`escapeHtml()` trong `build-events.js`) — nội dung CMS coi như
  input không tin cậy dù do admin nhập.
- **Ảnh/link chỉ chấp nhận nếu đúng định dạng an toàn** (`isSafeImagePath`,
  `isSafeUrl` trong các script build) — không tin trực tiếp giá trị từ JSON.
