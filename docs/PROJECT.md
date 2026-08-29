# Cẩm nang An toàn số — tổng quan dự án

> Đọc file này trước tiên trong mọi phiên chat mới. Đây là bản đồ hệ thống, không phải
> hướng dẫn cài đặt (xem [DEPLOYMENT.md](DEPLOYMENT.md) cho phần đó), không phải
> nhật ký thay đổi (xem [CHANGELOG.md](CHANGELOG.md)), và không bao gồm hạng mục video dự
> thi riêng (xem [VIDEO-PRODUCTION.md](VIDEO-PRODUCTION.md)).

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
| `content/events/*.json` (1 file/sự kiện) + tuỳ chọn `content/nhap-hang-loat.json` (lô Excel đang chờ, xem "Nhập hàng loạt") | `scripts/build-events.js` | `data/events.json` | Timeline "Tuyên truyền An ninh mạng" + lưới "Hoạt động khác" |
| `content/site.json` (1 file) | `scripts/build-site.js` | `data/site.json` | Header, Hero, tiêu đề 2 mục, Footer |
| `content/gioi-thieu.json` (1 file) | `scripts/build-about.js` | `data/about.json` | Mục "Giới thiệu" |
| — (RSS ngoài + `content/ticker/*.json` tuỳ chọn) | `scripts/build-ticker.js` | `data/ticker.json` | Dải tin chạy đầu trang |
| `content/ky-nang/*.json` (1 file/kỹ năng) | `scripts/build-skills.js` | `data/skills.json` | Mục "Bộ kỹ năng An toàn số" |

**Nếu sửa code mà không thấy hiệu lực khi test local**: luôn chạy lại
`node scripts/build-events.js && node scripts/build-ticker.js && node scripts/build-about.js
&& node scripts/build-site.js && node scripts/build-skills.js` trước khi mở server —
`data/*.json` không tự sinh.

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
scripts/import-events-xlsx.js  Nhập hàng loạt tại máy — ghi ra content/events/*.json
                       riêng, tiêu thụ ảnh trong Anh-nhap-hoat-dong/. Xem mục
                       "Nhập hàng loạt" bên dưới.
scripts/lib/xlsx-events.js  Thư viện đọc .xlsx dùng chung giữa import-events-xlsx.js
                       và build-events.js — tự viết ZIP/XML reader, không dùng thư viện
                       xlsx ngoài (giữ đúng nguyên tắc "chỉ Node core").
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
  chỉ là chưa có số). `loadVisitCounter()` hiển thị `count + 1` (không phải số gốc) vì
  script đếm của GoatCounter (`count.js`, tải `async`) có thể chưa kịp cộng lượt xem CỦA
  CHÍNH TRANG ĐANG MỞ vào `TOTAL.json` tại thời điểm gọi — +1 là ước tính hợp lý cho lượt
  đang xem, không phải số bịa. Gọi lại mỗi 60 giây (`setInterval`) để số "sống" hơn khi có
  người khác truy cập trong lúc trang đang mở — miễn phí, GoatCounter không tính phí theo
  lượt gọi API đếm công khai, không liên quan credit Netlify. **Không cộng khống số liệu**
  (đã có người dùng đề nghị +10.000 lượt để "tăng uy tín" — từ chối, vì đây là dữ liệu có
  thể kiểm chứng công khai qua chính API trên, cộng khống là thông tin sai sự thật, đi
  ngược tôn chỉ "trung thực" của một trang tuyên truyền chống lừa đảo).
- **Đo lường thao tác (`trackEvent()`)**: gọi `window.goatcounter.count({path, title,
  event: true})` — GoatCounter coi mỗi lời gọi là 1 "custom event", xem được trong
  GoatCounter dashboard tách biệt với lượt xem trang thường. Rải rác khắp `main.js` ở mọi
  nút/link quan trọng (menu, sự kiện, ảnh, link tham khảo, bộ lọc, quiz...). **Bẫy dễ gặp**:
  các phần tử nằm NGOÀI `#site-nav` (như `#mobile-quick-nav`, `#theme-toggle` — xem mục
  "Truy cập nhanh riêng cho mobile") sẽ KHÔNG được `setupNav()` tự động bắt (nó chỉ
  `querySelectorAll("a")` bên trong `#site-nav`) — phải khai báo tracking riêng, xem
  `setupExtraTracking()`. Khi thêm phần tử tương tác mới nằm ngoài `#site-nav`, nhớ thêm
  `trackEvent()` thủ công vào đó.
- **Thư viện ảnh & video** (modal `#media-library-modal`, `collectMediaItems()` trong
  `main.js`): gộp ảnh + video từ **các sự kiện thật do đơn vị tự nhập** (bỏ qua sự kiện
  auto-feed hvcsnd.edu.vn — nhận diện qua `slug` bắt đầu `feed-` — vì ảnh feed luôn có
  ngày mới nhất mỗi lần build, chiếm hết đầu danh sách nếu không lọc), mở bằng cách bấm ô
  "Thư viện ảnh & video" (class `.js-stat-media-tile`, có ở cả 2 vị trí nói trên). Sắp
  xếp mới nhất lên đầu — không cần sort riêng vì `allEvents` (từ `data/events.json`) đã
  được `build-events.js` sắp giảm dần theo ngày sẵn, chỉ cần lọc rồi giữ nguyên thứ tự.
  Ảnh → lightbox (`z-index: 200`, cao nhất trang — phải cao hơn mọi modal khác vì
  thường mở TỪ BÊN TRONG 1 modal đang mở, ví dụ chính thư viện ảnh này); video → mở modal
  chi tiết sự kiện đó. Lưới chỉ hiện ảnh thuần (không có chữ tiêu đề phủ lên như trước —
  người dùng phản hồi "rối mắt"), tên hoạt động chỉ còn ở thuộc tính `title` (tooltip khi
  hover), không hiển thị mặc định.
- **Lightbox có điều hướng trước/sau** (`lightboxGallery`/`lightboxIndex`/
  `lightboxStep()`/`setupLightbox()` trong `main.js`): `openLightbox(src, gallery, index)`
  nhận thêm danh sách ảnh cùng nhóm + vị trí hiện tại (tham số tuỳ chọn, gọi
  `openLightbox(src)` một mình vẫn hoạt động bình thường cho ảnh đơn lẻ). Dùng ở 3 nơi:
  gallery ảnh trong chi tiết sự kiện (`allSrcs` = toàn bộ ảnh của sự kiện đó), Thư viện
  ảnh & video (`imageSrcs` = toàn bộ ảnh trong lưới, theo đúng thứ tự hiển thị), lưới
  Infographic Bộ kỹ năng (`imageSkillSrcs`). Điều hướng qua nút mũi tên
  (`#lightbox-prev`/`#lightbox-next`), phím `ArrowLeft`/`ArrowRight`, hoặc vuốt chạm
  (`touchstart`/`touchend`, ngưỡng lệch ngang > 50px VÀ lớn hơn lệch dọc × 1.5 để không
  nhầm với cử chỉ cuộn trang dọc thông thường) — mô phỏng UX xem nhiều ảnh trên Windows.
- **Mini-quiz an toàn số** (`#quiz-section`, `setupQuiz()` trong `main.js`): 6 câu trắc
  nghiệm cố định trong HTML (không qua CMS — nội dung giáo dục cần kiểm duyệt kỹ, không
  nên để chỉnh sửa tự do), mỗi câu có `data-correct` (đáp án đúng) trên `.quiz-question`.
  Nộp bài: tô xanh đáp án đúng/đỏ gạch ngang đáp án sai đã chọn, hiện `.quiz-explain`,
  tính điểm + thông điệp động viên theo mức điểm, gọi `trackEvent("/quiz/nop-bai", "x/6")`
  để biết mức độ hiểu bài của người dùng. Không cần backend — chấm hoàn toàn phía client.
- **Form đăng ký bản tin** (`#newsletter-section`, `setupNewsletterForm()`): thu email qua
  **Netlify Forms** — cùng cơ chế với `#feedback-form` (form tĩnh có `data-netlify="true"`
  + `netlify-honeypot`, JS submit bằng `fetch("/")` POST `application/x-www-form-urlencoded`
  thay vì để trình duyệt tự submit, để không rời trang). Netlify tự nhận diện form này lúc
  build vì nó nằm tĩnh trong `index.html` (không phải form dựng bằng JS lúc runtime — nếu
  sau này chuyển form sang dựng động, phải thêm 1 bản HTML tĩnh ẩn đâu đó để Netlify quét
  thấy, xem tài liệu Netlify Forms). Xem submissions tại Netlify dashboard → Forms. **Chưa
  có link theo dõi Zalo OA** (ưu tiên 4 gốc còn có ý gắn Zalo OA) — cần người dùng xác nhận
  đã có tài khoản Zalo OA thật trước khi thêm, tránh dẫn tới link không tồn tại.
- **Bộ kỹ năng An toàn số** (`#ky-nang-section`, collection CMS `ky_nang` →
  `content/ky-nang/*.json` → `scripts/build-skills.js` → `data/skills.json`): lưới ảnh/
  infographic về thủ đoạn lừa đảo + cách phòng ngừa, bấm ảnh mở lightbox cỡ lớn. Khác
  với "Hoạt động" — không có ngày/địa điểm, chỉ có tiêu đề + ảnh (tuỳ chọn) + mô tả ngắn
  + link (tuỳ chọn) — cần ít nhất 1 trong 2 (ảnh hoặc link), thiếu cả 2 thì bị bỏ qua.
  Mục không có ảnh thì không hiện `<img>` hay khung giữ chỗ nào — chỉ có chữ (tiêu đề/mô
  tả/link nếu có). Cùng quy tắc áp dụng cho thẻ lưới "Hoạt động" (`buildActivityCard()`)
  và khung "Ảnh minh chứng đang được cập nhật" trong chi tiết sự kiện (đã bỏ hẳn, không
  còn `buildEventCoverPlaceholder()`) — placeholder icon từng bị đánh giá là "nhìn như
  ảnh lỗi", nên quy ước chung của site là: chưa có ảnh → ẩn hẳn phần ảnh, có ảnh mới hiện.
  **Cố ý KHÔNG tự động lấy ảnh/infographic từ nguồn ngoài** (khác với feed hoạt động ở
  trên) — infographic là tác phẩm đồ hoạ hoàn chỉnh, rủi ro bản quyền cao hơn hẳn
  headline+link tin tức, nên để trống chờ admin tự tải ảnh do đơn vị làm/có bản quyền.
  Bài viết dạng link (không ảnh riêng) thì được — đã thêm 5 bài từ nguồn chính thống
  (Bộ Công an, Bộ KH&CN, Công an tỉnh) theo cách chọn lọc thủ công tương tự, không phải
  auto-scrape.
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
- **Carousel ở khung logo lớn trong Hero** (`#hero-icon`, dưới thanh điều hướng, sát
  ngay dải tin "Thời sự" — KHÔNG phải logo nhỏ ở header, đã thử nhầm chỗ này 1 lần),
  `setupHeroCarousel()` trong `main.js`: 16 slide cố định (huy hiệu `img/badge.png` + 15
  ảnh `uploads/banner-01.jpg`…`banner-15.jpg`), tự chạy vòng vô hạn, **4 giây/ảnh**
  (2 giây ban đầu bị chê nhanh gây hoa mắt), hiệu ứng trượt ngang (class
  `.is-active`/`.is-prev`, transition `transform: translateX()` 0.9s trong CSS — không
  dùng thư viện carousel ngoài). `.hero-icon` có **`aspect-ratio: 16/9`** cố định (ban đầu
  4:3, đổi theo yêu cầu "ảnh chữ nhật"), bề rộng **cố định** `min(720px, 94vw)` — đã BỎ
  cơ chế `syncHeroIconWidth()` đo khớp chữ tiêu đề (không còn phù hợp khi đây là 1 khối
  banner lớn độc lập, không phải logo nhỏ nữa). Slide huy hiệu (`data-logo="true"`)
  dùng `object-fit: contain` + không có màu nền phía sau (trong suốt, tránh lộ khung
  trắng xấu — đã bị phản hồi 1 lần) trong khi các ảnh Banner dùng `object-fit: cover`.
  Danh sách ảnh **cố định trong HTML**
  (không qua CMS) vì đây là dàn ảnh cố định do admin chọn tay 1 lần, không phải nội dung
  cập nhật thường xuyên như sự kiện. Ảnh nguồn gốc để ở `uploads/Banner/` (gitignore,
  nặng 60KB–8.7MB/ảnh) — đã nén xuống `uploads/banner-NN.jpg` (60–165KB, commit vào Git)
  qua `scripts/process-banner-photos.py`. Xem mục "Xử lý ảnh thật dung lượng lớn" bên dưới.
- **Logo**: `img/badge.png` (huy hiệu tròn, dùng ở header + hero + favicon) và
  `img/favicon.png` — sinh ra bằng cách crop/resize từ file gốc trong `logo/` (không
  commit). ~~Chiều rộng logo ở Hero từng tự đo bằng JS để khớp chữ tiêu đề~~ — đã bỏ khi
  `#hero-icon` chuyển thành khối carousel banner 16:9 cỡ lớn (xem bullet "Carousel ở khung
  logo lớn trong Hero" phía trên), giờ bề rộng cố định qua CSS, không cần JS đo nữa.
- **Đoạn mô tả Hero xuống dòng chủ động**: `#hero-subtitle` có CSS
  `white-space: pre-line` — Enter trong ô "Đoạn mô tả" ở `/admin` sẽ xuống dòng đúng
  vị trí đó trên trang, không phụ thuộc trình duyệt tự ngắt.
- **Menu chính rút gọn + dropdown "Thêm"**: `#site-nav` chỉ hiện trực tiếp 6 mục cố định
  trong HTML (Trang chủ, Giới thiệu, Tuyên truyền, Chuyển đổi số, Bộ kỹ năng An toàn số,
  Liên hệ) + nút "Thêm" (`#nav-more-toggle`/`#nav-more-links`, `setupNavMore()` trong
  `main.js`) gom các mục còn lại (hiện là Đổi mới sáng tạo, Khác, Nghiên cứu khoa học,
  Kiểm tra nhanh). Mục nào hiện trực tiếp / mục nào vào "Thêm" là **lựa chọn thủ công của
  người dùng, sửa trực tiếp trong `index.html`** (di chuyển thẻ `<a>` vào/ra khỏi
  `#nav-more-links`) — không có logic tự động, không phải CMS hoá. Nút "Thêm" là **icon
  tròn 38×38 (3 chấm ngang)**, không còn chữ "Thêm" + mũi tên như bản đầu (người dùng phản
  hồi chữ nhỏ khó bấm, muốn icon to/đẹp hơn) — cố ý dùng **3 chấm NGANG** để phân biệt trực
  quan với icon "..." (3 chấm DỌC, nhỏ, kín đáo) của `#admin-toggle` kế bên, tránh nhầm 2
  menu có ý nghĩa khác hẳn nhau (nội dung công khai vs quản trị nội bộ).
- **Truy cập nhanh riêng cho mobile** (`#mobile-quick-nav`, dưới 940px — pill chữ Giới
  thiệu/Tuyên truyền/Bộ kỹ năng, KHÔNG dùng icon — thử icon trước đó bị người dùng phản
  hồi không rõ nghĩa, đổi lại thành chữ): người dùng phản hồi trên điện thoại toàn bộ menu
  (kể cả nút Sáng/Tối) bị ẩn hết vào hamburger, khó bấm. Fix: `#mobile-quick-nav` là 1 khối
  RIÊNG, nằm ngoài `<nav id="site-nav">`, luôn hiện trực tiếp trong vùng đỏ trên mobile
  (menu đầy đủ trong hamburger vẫn còn nguyên, không xoá), cuộn ngang (`overflow-x: auto`)
  nếu không đủ chỗ thay vì xuống dòng/tràn. `#theme-toggle` cũng được **di chuyển ra ngoài
  `<nav>`** (trước đây nằm trong, nên bị collapse theo cùng site-nav trên mobile) để luôn
  hiện được ở cả 2 kích thước màn hình — do đó CSS mobile override riêng cho `.theme-toggle`
  (full-width row trong danh sách sổ xuống) đã bị xoá, giờ nó giữ nguyên style icon-button
  30×30 như desktop trên mọi kích thước.
- **CMS hoá gần như toàn bộ chữ tĩnh**: header, hero, tiêu đề 2 mục Tuyên truyền/Hoạt
  động khác, footer đều sửa được qua `/admin` → "Nội dung chung trang web". Nhãn các
  nút/panel nhỏ (Thời sự, Số liệu nổi bật, Hòm thư góp ý...) vẫn cố định trong code
  (chưa CMS hoá, coi là "UI chrome" chứ không phải nội dung).

- **Xem link tham khảo ngay trong trang** (`openLinkModal()` trong `main.js`): bấm "Xem
  bài viết tham khảo" mở modal `<iframe>` nhúng trang đó, không rời trang. Nhiều trang
  (`.gov.vn`, Facebook, Google...) tự chặn nhúng bằng `X-Frame-Options`/`frame-ancestors`
  — bảo mật của chính trang đó, không có cách "vượt qua" (và không nên).
  **Không có cách JS nào đáng tin cậy 100% để phát hiện việc bị chặn** — đã thử mẹo đọc
  `iframe.contentWindow.location.href` (bị chặn thì còn `"about:blank"` không ném lỗi, tải
  được thì ném `SecurityError`) nhưng kiểm chứng thực tế cho thấy Chrome hiện đại render 1
  trang lỗi nội bộ (interstitial) cho request bị chặn — trang đó CŨNG khác gốc với trang
  cha nên đọc `.href` CŨNG ném `SecurityError` giống hệt trường hợp tải thành công, không
  phân biệt được. Giải pháp 2 lớp hiện tại:
  1. `IFRAME_BLOCKED_HOST_PATTERNS` (danh sách tên miền **đã biết chắc sẽ chặn** — mọi
     `*.gov.vn`, Facebook, Google, YouTube): bỏ qua hẳn iframe, `window.open()` tab mới
     ngay lập tức, không loé modal trống rồi mới chuyển (theo đúng phản hồi người dùng —
     không muốn thấy cảnh báo/phải tự bấm).
  2. Tên miền còn lại: vẫn thử iframe bình thường, có `setTimeout` 6 giây — nếu `onload`
     chưa từng bắn được (mạng treo/lỗi thật) thì tự đóng modal + mở tab mới. Trường hợp bị
     chặn nhưng KHÔNG nằm trong danh sách (hiếm, chưa gặp) sẽ không tự động được vì
     `onload` vẫn bắn bình thường cho trang lỗi interstitial — nút "Mở tab mới ↗" ở góc
     modal vẫn còn làm lối thoát thủ công cho đúng trường hợp tồn đọng này.
  3. Khi phát hiện thêm nguồn nào hay bị chặn nhưng chưa nằm trong danh sách, thêm pattern
     tên miền mới vào `IFRAME_BLOCKED_HOST_PATTERNS` thay vì cố sửa lại cơ chế phát hiện
     (đã xác nhận không khả thi ở bước trên).
- **Offline / chưa deploy**: `/admin` cần Netlify Identity thật nên không chạy được ở
  local. Thêm nội dung khi không có mạng: `scripts/add-event.js` (bấm đúp
  `Them-su-kien.bat`) — CLI hỏi từng bước, ghi thẳng vào `content/events/*.json` và
  tự chạy lại `build-events.js`. Xem [README.md](../README.md) mục "Thêm nội dung khi
  offline".
- **Nhập hàng loạt sự kiện (tiết kiệm credit Netlify)** — 2 cách, dùng chung
  `scripts/lib/xlsx-events.js` (tự đọc ZIP/XML của `.xlsx` bằng Node core, không dùng
  thư viện `xlsx` ngoài — giữ nguyên tắc "chỉ Node core, không cần npm install"):
  - **Tại máy (`scripts/import-events-xlsx.js`, bấm đúp `Nhap-hang-loat.bat`)**: đọc
    `uploads/mau-nhap-hoat-dong.xlsx` + ảnh trong `Anh-nhap-hoat-dong/` → **ghi ra file
    riêng vĩnh viễn** cho từng dòng vào `content/events/*.json` (giống hệt 1 sự kiện tạo
    tay), ảnh được copy vào `uploads/` rồi **xoá khỏi thư mục thả ảnh** (đã "tiêu thụ").
    Dùng khi muốn xong hẳn 1 lần, không cần quay lại.
  - **Qua web (`/admin` → "Nhập hàng loạt (Excel)")**: admin tải file `.xlsx` lên qua
    field `file` (Decap ghi đường dẫn vào `content/nhap-hang-loat.json`). Ảnh tải lên qua
    tab Media (đặt tên đúng quy ước, không đổi tên trong web). **`scripts/build-events.js`
    tự đọc lại `content/nhap-hang-loat.json` ở MỌI lần build**, ghép các dòng hợp lệ trực
    tiếp vào `data/events.json` — **không ghi/xoá gì trong repo** (Netlify build không
    commit ngược lại git được), nên đây là dữ liệu "sống" theo đúng file đang được trỏ
    tới, KHÔNG phải file riêng vĩnh viễn. ⚠️ **Chỉ nên có 1 lô đang xử lý tại 1 thời
    điểm** — nếu tải file `.xlsx` MỚI lên (thay `content/nhap-hang-loat.json`), lô cũ sẽ
    biến mất khỏi trang (vì nó chưa từng được ghi thành file riêng). Trước khi tải lô
    mới, nhờ Claude "chốt" lô hiện tại (chạy `import-events-xlsx.js` để ghi thành file
    riêng) rồi mới tải lô tiếp theo.
  - **Mã sự kiện dùng để ghép ảnh**: `<Ngày dạng YYYYMMDD>-<STT>` (hàm
    `computeEventCode()` trong `xlsx-events.js`) — ghép cả Ngày vì cột STT reset về 1 mỗi
    lần điền file mới, dễ trùng mã giữa các lần nhập khác nhau nếu chỉ dùng STT.
  - Lý do tồn tại: 1 lần push/lưu cho N sự kiện = 15 credit, thay vì N lần lưu qua
    `/admin` = 15×N credit (xem bảng giá credit trong [DEPLOYMENT.md](DEPLOYMENT.md)).
  - Cột mẫu hiện có: STT, Tiêu đề, Phân loại, **Số kế hoạch** (metadata văn bản chính
    thức, field `planNumber`, hiển thị trong chi tiết sự kiện), Ngày, Địa điểm, Nội dung,
    Link tham khảo, Link video, Ghi chú ảnh — không đổi thứ tự/xoá cột đã có.
  - Hướng dẫn đặt tên ảnh đầy đủ nằm sẵn trong
    `Anh-nhap-hoat-dong/HUONG-DAN-DAT-TEN-ANH.txt` (script tự tạo lại file này nếu bị xoá
    mất hoặc clone repo lần đầu).

- **Xử lý ảnh thật dung lượng lớn** (`scripts/process-event-photos.py`,
  `scripts/process-banner-photos.py` — Python, dùng `Pillow` + `pillow-heif`, KHÔNG
  phải Node như các script build khác vì cần decode HEIC + nén JPEG chất lượng cao):
  - Ảnh gốc do người dùng thả vào các thư mục `uploads/<Tên địa điểm>/` thường rất nặng
    (ảnh iPhone `.HEIC` 1–8MB/ảnh, ảnh gốc camera 6–18MB/ảnh) — CMS/Decap yêu cầu <1MB
    mỗi ảnh (xem hint field `images` trong `admin/config.yml`), và HEIC trình duyệt
    thường không hiển thị được (trừ Safari).
  - Quy trình: mở bằng `Pillow` (`pillow_heif.register_heif_opener()` để đọc `.HEIC`) →
    `ImageOps.exif_transpose()` (sửa ảnh bị xoay sai do EXIF) → resize cạnh dài nhất về
    ≤1600px (ảnh sự kiện) hoặc ≤900px (ảnh banner nhỏ) → xuất JPEG, giảm dần quality từ
    82–85 tới khi dưới ngưỡng (950KB ảnh sự kiện / 220KB ảnh banner) hoặc chạm quality
    sàn 55 → ghi phẳng vào `uploads/<prefix>-NN.jpg` theo đúng quy ước CMS (không thư
    mục con, không dấu/khoảng trắng trong tên file).
  - `process-event-photos.py` có sẵn bảng ánh xạ cứng (`GROUPS`) từ tên thư mục nguồn →
    tên file đích → danh sách file `content/events/*.json` cần cập nhật field `images`
    — đây là script **một lần cho một đợt ảnh cụ thể** (không tổng quát/tái sử dụng
    nguyên vẹn cho đợt ảnh khác), cần sửa lại `GROUPS` mỗi khi có ảnh mới cần ghép. Sau
    khi chạy xong luôn phải `node scripts/build-events.js` lại để `data/events.json`
    nhận ảnh mới.
  - Thư mục ảnh gốc (`uploads/<Tên địa điểm>/`, `uploads/Banner/`) đã liệt kê hết vào
    `.gitignore` — chỉ ảnh đã nén (`uploads/*.jpg` phẳng) mới commit vào Git. Nếu có đợt
    ảnh mới, nhớ thêm thư mục nguồn mới vào `.gitignore` theo đúng mẫu các dòng
    `/uploads/<Tên>/` hiện có, tránh commit nhầm ảnh gốc nặng.

- **Feed hoạt động tự động từ hvcsnd.edu.vn**: `build-events.js` quét trực tiếp trang
  `/tag/<slug>` của Học viện CSND cho 3 danh mục (Chuyển đổi số, Đổi mới sáng tạo,
  Nghiên cứu khoa học — xem `ACTIVITY_FEED_SOURCES`), lấy tối đa 9 bài mới nhất/danh
  mục kèm ảnh đại diện thật (CDN `cdn.hvcsnd.edu.vn`). Chạy lại ở MỌI lần build nên tự
  cập nhật theo đúng trang chủ Học viện — không ghi file, không cần thao tác tay. Trang
  không hiển thị ngày đăng rõ ràng nên dùng ngày trong đường dẫn ảnh CDN
  (`/uploads/YYYY/MM/DD/...`) làm proxy — khá sát ngày đăng thật. Nếu hvcsnd.edu.vn đổi
  cấu trúc HTML, feed sẽ tự động trả về rỗng cho danh mục đó (không lỗi build, xem log
  `[activity-feed]`) — cần cập nhật lại regex trong `parseHvcsndTagPage()`.

- **Nội dung tóm tắt (`body`) của sự kiện tuyên truyền**: khi 1 sự kiện có tiêu đề/địa
  điểm/link nhưng để trống `body`, phần "buổi hôm đó báo cáo viên đã truyền đạt kỹ năng
  gì" là phần quan trọng nhất với mục đích tuyên truyền của site — **nếu người nhập chưa
  viết, chủ động viết bổ sung** thay vì để trống, theo nguyên tắc: sự kiện nào có `link`
  nguồn thật thì `WebFetch` bài viết gốc rồi diễn giải lại (không copy nguyên văn, không
  bịa số liệu ngoài bài); sự kiện không có `link` thì viết theo đúng chủ đề đã nêu sẵn
  trong tiêu đề + cấp học tương ứng (tiểu học/THCS/THPT/đại học/cộng đồng dân cư — văn
  phong và độ phức tạp kỹ năng khác nhau theo đối tượng), tuyệt đối không bịa số liệu cụ
  thể (số người tham dự, trích dẫn...) khi không có nguồn xác thực.

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
- **Hiệu ứng hover/chạm dùng chung** (đầu `css/style.css`, ngay sau reset `a { color:
  inherit }`): bọc trong `@media (prefers-reduced-motion: no-preference)`, chỉ THÊM
  trạng thái `:active { transform: scale(0.96) }` cho các khối/nút tương tác chính —
  không ghi đè `:hover` riêng đã có ở từng component (vd `.activity-card:hover` dịch lên
  2px vẫn giữ nguyên chỗ định nghĩa cũ). Thêm class/selector mới vào 2 danh sách chọn
  trong khối này nếu có component tương tác mới cần hiệu ứng tương tự.
