# Vận hành & Deploy

> **Trạng thái 21/9/2026:** Đã cấp lại quyền CLI đúng tài khoản
> `vuongppa@gmail.com` và đặt team `quocvuongt32` hạ từ Personal 9 USD xuống Free.
> Netlify xác nhận `scheduled_downgrade_date: 2026-10-20`, đích đến `credit-free`;
> gói Personal vẫn dùng được hết kỳ hiện tại nhưng không tự gia hạn sang kỳ trả phí mới.
> Website chính vẫn chạy Cloudflare Pages. Cấu hình mới: Node.js 24, build command
> `npm run build`, output `dist/`, Pages Functions trong `functions/`.

## Cấu hình Cloudflare Pages hiện hành

- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `24`
- Biến môi trường bản tin: `RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `NEWSLETTER_FROM`
- Chỉ `dist/` được public; `docs/`, `content/`, `scripts/`, `admin/`, `netlify.toml`
  không được xuất bản.
- Workflow `.github/workflows/backup-content.yml` sao lưu nội dung hằng tuần, giữ 90 ngày.

### Tin nhanh tự cập nhật

- Endpoint: `/api/quick-news` → `functions/api/quick-news.js`.
- Nguồn: chuyên mục **an ninh mạng** của Cổng thông tin Bộ Công an và chuyên mục
  **chuyển đổi số** của Báo điện tử Chính phủ.
- Cloudflare cache response 6 giờ (`s-maxage=21600`) và cho phép dùng bản cũ thêm 24 giờ
  trong lúc cập nhật (`stale-while-revalidate`). Như vậy tin tự thay đổi trong ngày mà
  không cần commit/deploy mới và vẫn nằm trong gói miễn phí.
- Trình duyệt cache 15 phút. Nếu function hoặc nguồn ngoài lỗi, frontend đọc
  `data/ticker.json`; website không bị trắng hay chặn tải.
- Bộ trích số liệu chỉ nhận câu có đơn vị rõ (%, tỷ, triệu, giao dịch, hồ sơ...) và luôn
  gắn liên kết/ngày nguồn. Giao diện ghi rõ đây là trích dẫn, không phải số liệu thời gian
  thực.

> Đọc [PROJECT.md](PROJECT.md) trước để hiểu kiến trúc. File này là phần "vận hành":
> hosting, CSP, và các sự cố đã gặp + cách đã sửa (để không lặp lại).

## ✅ Đã chuyển hosting sang Cloudflare Pages (6/9/2026)

Lý do: Netlify tính **băng thông 20 credit/GB**, traffic đợt dự thi làm hết credit và
**tạm dừng cả site** 2 lần (30/8 và 6/9). Cloudflare Pages **miễn phí băng thông không
giới hạn**. Đã bỏ `/admin` (Decap CMS + Netlify Identity) — từ nay thêm/sửa nội dung
bằng script + `git push` (xem [README.md](../README.md)).

**Trạng thái: site đã LIVE trên `https://tuyentruyen.khoaktt.vn` qua Cloudflare Pages**
(project `tuyentruyen`, account `Choanhhonmotcaj@gmail.com` — cùng account giữ zone
`khoaktt.vn`). DNS record `tuyentruyen` đã trỏ CNAME → `tuyentruyen.pages.dev`.
Còn lại: cân nhắc gỡ site Netlify cũ sau khi xác nhận không còn dữ liệu cần giữ. Gói 9 USD
đã được đặt hạ về Free vào cuối kỳ hiện tại.

### Thay đổi đã làm trong repo (commit 6/9/2026)

| File | Việc |
|---|---|
| `_headers` | Doc header cho Cloudflare Pages — thay khối `[[headers]]` của `netlify.toml` (CSP, bảo mật, cache ảnh) |
| `_redirects` | `/admin/*` → `/` (bookmark cũ không còn 404) |
| `.node-version` | `18` — Pages build đúng phiên bản Node |
| `index.html`, `js/main.js` | 2 form (góp ý + đăng ký bản tin) chuyển từ **Netlify Forms** sang **Web3Forms** (`api.web3forms.com`, free, không backend). Bỏ `redirectIdentityTokens()`, bỏ link `/admin` trên menu |
| `netlify.toml`, `netlify/functions/`, `admin/` | **Giữ tạm** để có đường lùi nếu Pages trục trặc; xoá ở commit dọn dẹp sau khi cutover xong |

### Đã làm xong (6/9/2026)

1. ✅ **Web3Forms**: access key `b1fac0ec-...` đã dán vào 2 form trong `index.html`
   (commit `d6164de`). Test thật từ trình duyệt lẫn từ domain production: `success: true`.
2. ✅ **Pages project `tuyentruyen`**: connect Git `quocvuongt32/tuyentruyen` nhánh `main`.
   Build command = chuỗi `node scripts/build-*.js`; output `/`; `NODE_VERSION=18`.
   Deploy đầu tiên thành công.
3. ✅ **Test `tuyentruyen.pages.dev`**: nội dung đủ, `/admin/` redirect 302, form OK.
4. ✅ **Đổi domain**: `tuyentruyen.khoaktt.vn` thêm vào Custom domains, DNS CNAME đổi
   `rainbow-seahorse-1aa78d.netlify.app` → `tuyentruyen.pages.dev`. Site live, SSL OK,
   `server: cloudflare`.

### Việc còn lại — tùy chọn sau khi Pages chạy ổn

5. ✅ **Đã hủy tự gia hạn Netlify**: ngày 21/9/2026, team `quocvuongt32` được đặt hạ
   từ Personal 9 USD xuống Free vào `2026-10-20`. API đã được đọc lại hai lần để xác nhận.
6. **Tùy chọn gỡ site cũ**: chỉ xóa site `rainbow-seahorse-1aa78d` sau khi xác nhận không
   còn dữ liệu cần giữ. Việc hạ gói không xóa site hay tài khoản.

### Sau khi cutover

- Chi phí: **$0/tháng**. Băng thông không giới hạn → sự cố hết credit không tái diễn.
- Không cần proxy Cloudflare thủ công nữa (Pages đã ở sẵn trên mạng Cloudflare).
- Deploy: mỗi `git push` lên `main` → Pages tự build (`node scripts/build-*.js`) + deploy.
  Không còn giới hạn credit; xem log build tại Cloudflare → Workers & Pages → `tuyentruyen`
  → Deployments.
- Mất: `/admin`; email chào mừng bản tin tự động qua Resend (`netlify/functions/`, vốn
  **chưa từng chạy live**). Đăng ký bản tin giờ rơi vào hộp mail qua Web3Forms — muốn
  tự động hoá lại thì port `netlify/functions/*.js` sang **Pages Functions** (thư mục
  `functions/`, cùng là JS, khác chữ ký handler) — chưa làm.

### Hạ tầng (mục tiêu sau cutover)

- **Domain**: tuyentruyen.khoaktt.vn — DNS ở Cloudflare, trỏ tới Cloudflare Pages.
- **Repo GitHub**: `quocvuongt32/tuyentruyen`, branch `main` — Pages build tự động mỗi
  lần push.
- **Build**: chuỗi `node scripts/build-*.js`, output `.` (toàn repo). `data/*.json`
  sinh ra lúc build (gitignore).
- **Form**: Web3Forms (không backend). **Không còn** Netlify Identity / Git Gateway /
  Netlify Forms / Netlify Functions.

---

## Thông tin hạ tầng Netlify (cũ — giữ tham khảo tới khi cutover xong)

- **Netlify site**: `rainbow-seahorse-1aa78d` (tên nội bộ Netlify), team `quocvuongt32`,
  chủ tài khoản email `vuongppa@gmail.com`.
- **Build command** (trong `netlify.toml`):
  ```
  node scripts/build-events.js && node scripts/build-ticker.js && node scripts/build-about.js && node scripts/build-site.js && node scripts/build-skills.js
  ```
  Publish directory: `.` (toàn bộ repo, không có thư mục `dist/build` riêng).

## 💳 Credit Netlify — gói Personal, quy tắc duy trì free — cập nhật 20/8/2026

**Đã nâng cấp lên gói Personal ($9/tháng, 1.000 credit/tháng)** vào 20/8/2026 để giải
quyết việc hết credit gói Free (300/tháng) chặn deploy ngay trước deadline thi (xem lịch
sử sự cố ở cuối mục này). Credit **không cộng dồn qua tháng** (reset mỗi chu kỳ, ngày
gia hạn theo ngày nâng cấp — lô hiện tại "Granted August 20, 2026 · Expires September 20,
2026"). Kiểm tra số dư: `https://app.netlify.com/teams/quocvuongt32/billing#credits`
(mục "Credit balance" — lưu ý UI có thể trễ vài phút, đôi khi lâu hơn, mới cập nhật số
sau 1 lần trừ credit thật).

**Bảng giá credit chính xác** (theo docs Netlify, không phụ thuộc build nhanh/chậm):

| Việc gì | Credit |
|---|---|
| 1 lần **production deploy** (push code lên `main`, hoặc admin bấm Lưu trong `/admin` — Decap CMS commit thẳng vào `main`, Auto publish đang bật) | **15 credit / lần, cố định** |
| Deploy preview / nhánh khác `main` / deploy lỗi | Miễn phí, không tính |
| Lượt truy cập trang | 2 credit / 10.000 request |
| Băng thông tải xuống | 20 credit / 1 GB |

→ 1.000 credit/tháng ≈ ngân sách khoảng 66 lần deploy nếu dùng hết cho việc đó (traffic
thật của khách xem trang ăn vào cùng 1.000 credit này song song, không tách riêng).

**Quy tắc để duy trì gói Personal free trong ngân sách 1.000 credit/tháng** (không cần
bật Auto recharge — hiện đang tắt):

1. **Gộp thay đổi trước khi Lưu/push** — không sửa 1 chữ rồi Lưu ngay; gom nhiều bài/nhiều
   sửa đổi trong ngày rồi mới Lưu/`git push` 1 lần. Mỗi lần Lưu trong `/admin` tốn y hệt
   1 lần `git push` (đều là 1 production deploy = 15 credit).
2. **Thêm nhiều hoạt động cùng lúc qua file Excel** thay vì lần lượt qua `/admin` — xem
   công cụ nhập hàng loạt (mục dưới, nếu đã có `scripts/import-events-xlsx.js`): N hoạt
   động qua `/admin` = 15×N credit; qua Excel + 1 lần push = 15 credit tổng, bất kể N.
3. **Kiểm tra số dư định kỳ** (khoảng 1 lần/tuần là đủ) tại link Credit balance ở trên.
   Nếu số dư còn dưới ~150 credit mà chưa gần ngày reset (20 hàng tháng) → tạm hoãn các
   cập nhật không gấp tới đầu chu kỳ sau.
4. **Theo dõi traffic thật** qua GoatCounter (`https://vuongnq.goatcounter.com`, đã bật
   công khai số liệu 20/8/2026) — traffic là chi phí nền không kiểm soát được bằng thao
   tác admin, nhưng biết trước để không bị bất ngờ khi số dư giảm dù không ai cập nhật gì.
5. Nếu cần đăng gấp mà lỡ hết credit trước ngày reset: chủ tài khoản có thể tự bật
   **Auto recharge** (500 credit / $5) trong Usage & billing → Credits — Claude sẽ không
   tự bật mục này, cần chủ tài khoản xác nhận vì phát sinh phí thật.

**Lịch sử sự cố (gói Free, đã xử lý bằng cách nâng cấp — chỉ để tham khảo)**: hết credit
build ngày 19/8/2026 do đẩy nhiều commit liên tiếp trong 1 buổi (mỗi push = 1 build tốn
credit). Sau đó mọi deploy — kể cả `netlify deploy --prod` qua CLI — đều bị chặn
(`403 Forbidden` / lý do trong tab Deploys: `"Skipped due to account credit usage
exceeded"`). Trang public vẫn sống bình thường trong lúc bị chặn, chỉ không xuất bản
được bản mới. Đã cân nhắc và loại bỏ hướng "tạo tài khoản Netlify mới để né giới hạn" —
phải cấu hình lại domain/SSL + Identity + Git Gateway từ đầu, rủi ro cao ngay trước
deadline.

## Giảm băng thông (nguyên nhân chính gây hết credit Netlify)

Băng thông tải xuống tính **20 credit/GB** — 2 lần dừng site (30/8 và 6/9/2026) đều
do traffic đợt dự thi + ảnh nặng đốt hết 1.000 credit/tháng, không phải do deploy.
Các lớp phòng thủ đang có trong repo (không tốn thao tác, tự chạy mỗi build/deploy):

1. **Cache-Control dài cho ảnh** (`netlify.toml`, khối `[[headers]]` cho `/uploads/*`
   và `/img/*`): mặc định Netlify trả `max-age=0, must-revalidate` nên khách quay lại
   tải lại **toàn bộ** ảnh. Đã đặt `max-age=604800` (uploads, 7 ngày) / `2592000`
   (img, 30 ngày) + `stale-while-revalidate`. Đánh đổi: đổi ảnh **trùng tên** qua
   `/admin` thì khách đã cache thấy bản cũ tối đa 7/30 ngày rồi mới tự cập nhật —
   chấp nhận được với tần suất đổi ảnh của dự án. Muốn ép mới ngay: đổi tên file.
2. **Carousel Hero nạp ảnh theo lượt** (`index.html` dùng `data-src`,
   `setupHeroCarousel()` trong `main.js`): 16 `<img>` xếp chồng ở đầu trang khiến
   `loading="lazy"` vô tác dụng — trình duyệt tải cả ~1,8 MB banner ngay khi mở
   trang. Giờ chỉ gán `src` cho ảnh đang hiện + ảnh kế tiếp, khách lướt qua chỉ tải
   2–3 ảnh. **Nếu thêm ảnh banner mới**: dùng `data-src`, KHÔNG dùng `src`.
3. **`data/*.json` revalidate qua ETag** (bỏ `{ cache: "no-store" }` trong 5 hàm
   `load*()` của `main.js`): trước đây mỗi lần F5 tải lại nguyên `events.json`
   (~68 KB). Giờ trình duyệt gửi request có điều kiện, nhận `304` khi nội dung không
   đổi; mỗi lần deploy ETag đổi nên vẫn tự cập nhật.

**Việc CHƯA làm — cần chủ tài khoản thao tác thủ công, đòn bẩy lớn nhất còn lại:**

4. **Bật proxy Cloudflare** (hiện DNS-only): trong Cloudflare → DNS, bật đám mây cam
   cho bản ghi trỏ về Netlify; đặt SSL/TLS mode = **Full (strict)**; thêm Cache Rule
   giữ (cache) cho `/uploads/*`, `/img/*`, `/css/*`, `/js/*` với Edge TTL dài.
   Khi đó Cloudflare gánh phần lớn lượt tải ảnh, Netlify chỉ bị tính lần request
   gốc → giảm mạnh cả băng thông lẫn số request tính credit. **Rủi ro cần test sau
   khi bật**: `/admin` (Netlify Identity + Git Gateway) và Netlify Forms phải vẫn
   hoạt động — nếu lỗi, tạo Page Rule / Cache Rule **bypass cache** cho `/admin/*`
   và `/.netlify/*`. Làm ngoài giờ cao điểm, có thể tắt proxy về DNS-only ngay nếu
   hỏng.
5. **Theo dõi băng thông** tại Netlify → Usage trước mỗi đợt cao điểm; kết hợp
   GoatCounter để biết traffic thực.

## Content-Security-Policy (`netlify.toml`) — vì sao mỗi dòng tồn tại

Hai khối `[[headers]]` riêng biệt: `/*` (site public, khoá chặt) và `/admin/*` (nới
hơn vì Decap CMS cần tải script từ CDN + gọi API Identity/Git Gateway).

CSP `/admin/*` — **đừng rút gọn lại nếu chưa hiểu rõ từng phần, đã có 2 lần đứt tay
ở đây**:

```
connect-src 'self' blob: https://api.netlify.com https://*.netlify.app https://identity.netlify.com
```

- **`blob:` trong `connect-src`** — **bắt buộc để upload ảnh trong CMS hoạt động.**
  Decap CMS đọc file ảnh vừa chọn bằng cách `fetch()` vào chính URL `blob:` nó tự tạo
  ra (hàm nội bộ `Ia.toBase64` → `KB.uploadBlob` → `KB.persistFiles`), thao tác này
  thuộc phạm vi `connect-src`. Thiếu dòng này → mọi lần lưu bài có ảnh báo lỗi
  `"Failed to persist entry: TypeError: Failed to fetch"` — **đã từng bị nhầm sang
  sửa `img-src` trước** (không sai, nhưng không phải nguyên nhân chính — `img-src`
  chỉ ảnh hưởng phần xem trước ảnh, không ảnh hưởng bước upload thật).
- Domain thật của Git Gateway API là **same-origin**:
  `https://<site>/.netlify/git/github/...` (không phải `api.netlify.com` như hay
  nhầm) — đã xác minh qua Network tab thật. `'self'` trong `connect-src` đã đủ cho
  phần này; các domain `api.netlify.com`/`*.netlify.app`/`identity.netlify.com` là
  cho phần Identity (đăng nhập/refresh token), không phải Git Gateway.

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://identity.netlify.com https://unpkg.com
```

- **`unsafe-inline`** — cần cho đoạn `<script>` inline trong `admin/index.html` (xử lý
  điều hướng sau khi đăng nhập qua Identity). Thiếu dòng này thì đoạn script đó bị
  chặn âm thầm (không crash gì rõ ràng, chỉ mất đúng 1 luồng điều hướng sau login).
- **`unsafe-eval`** — Decap CMS bundle cần để chạy.

## CSP trang public chặn cả `<script>` inline — dùng file riêng

CSP `/*` là `script-src 'self' https://gc.zgo.at` — **không có `'unsafe-inline'`**.
Bài học thực tế: từng có 1 đoạn `<script>` inline nhỏ ngay đầu `<head>` (chọn giao diện
sáng/tối lúc tải trang) — bị trình duyệt **âm thầm chặn không chạy, không báo lỗi rõ
console** — khiến cả tính năng phụ thuộc vào nó không hoạt động trên bản live suốt một
thời gian dài mà không ai phát hiện ra (mọi thứ vẫn "trông bình thường" vì trang có màu
nền mặc định hợp lý). **Không thêm `<script>` inline nào vào trang public** — luôn tách
ra file riêng trong `js/` và nạp bằng `<script src="...">` (được `'self'` cho phép).
Muốn kiểm tra 1 đoạn JS có thực sự chạy trên bản live hay không: đừng chỉ nhìn qua có
vẻ đúng — kiểm tra trực tiếp bằng `curl` hoặc đọc `document.documentElement.getAttribute(...)`
qua console thật, vì lỗi CSP loại này không luôn hiện rõ ràng.

## Media/upload — giới hạn cần nhớ

- GitHub Contents API (mà Git Gateway dùng để commit file) **giới hạn ~1MB/file**.
  Ảnh chụp điện thoại thường 3-10MB → luôn lỗi nếu không nén trước. Đã ghi hint này
  trực tiếp trong `admin/config.yml` (field `images`).
- Ảnh **HEIC** (định dạng mặc định iPhone) đôi khi gây lỗi ở widget ảnh Decap — khuyên
  đổi sang JPG/PNG trước khi tải lên.
- Nếu "Failed to persist" xảy ra ngay cả với **bài chỉ có chữ, không ảnh**: nhiều khả
  năng do phiên đăng nhập Identity (JWT) hết hạn ngầm trong tab đang mở lâu — đóng tab,
  mở `/admin` lại, đăng nhập lại. Đã có trường hợp thực tế: bài lưu **thành công** dù
  giao diện báo lỗi đỏ — luôn kiểm tra lại danh sách bài trước khi đăng lại trùng.

## Hệ thống email bản tin (Resend + Netlify Functions) — CẦN THIẾT LẬP THỦ CÔNG

Code đã viết xong (`netlify/functions/`) và đã đối chiếu trực tiếp với API thật của Resend
(đăng nhập tài khoản `vuongppa@gmail.com` trên resend.com để kiểm tra tài liệu API-docs
thực tế) — API của Resend là "flat", **không có khái niệm Audience ID trong URL** như
tài liệu cũ từng giả định. Danh bạ dùng chung `/contacts`, gửi hàng loạt dùng `/broadcasts`
nhắm vào 1 **segment** (Resend tự tạo sẵn 1 segment mặc định tên **"General"** chứa toàn bộ
contact của tài khoản).

### 3 function

| File | Vai trò | Kích hoạt bởi |
|---|---|---|
| `netlify/functions/on-subscribe.js` | Gửi email chào mừng khi có người đăng ký form "Nhận cảnh báo..." + thêm email vào danh bạ Resend (`POST /contacts`) | Netlify Forms outgoing webhook (form `dang-ky-ban-tin`) |
| `netlify/functions/compose-newsletter.js` | Soạn bản nháp bản tin (lấy 5 sự kiện thật gần nhất từ `data/events.json`), gửi cho `ADMIN_EMAIL` kèm link duyệt | Admin tự bấm link (không tự động theo lịch) |
| `netlify/functions/approve-newsletter.js` | Xác minh link duyệt (chữ ký HMAC, hết hạn 48h), tạo + gửi 1 Resend Broadcast nhắm vào segment | Admin bấm nút "Duyệt & Gửi" trong email nháp |

### Các bước thiết lập (làm 1 lần)

1. **Tạo tài khoản** tại [resend.com](https://resend.com) (miễn phí, không cần thẻ) — **đã tạo xong** (workspace "vuongppa").
2. **Xác minh domain gửi** (Resend → Domains → Add Domain, thêm bản ghi DNS được yêu cầu
   vào domain `khoaktt.vn`/`tuyentruyen.khoaktt.vn` tại nơi quản lý DNS — hiện là
   Cloudflare theo mục "Thông tin hạ tầng" ở trên) — **chưa làm** (cần chủ động vào
   Cloudflare thêm bản ghi DNS, việc này ngoài phạm vi tự động thực hiện được). Trong lúc
   chưa xác minh domain, dùng địa chỉ gửi mặc định `onboarding@resend.dev` của Resend
   (giới hạn hơn, chỉ gửi được tới chính email đăng ký tài khoản Resend — **không dùng
   được cho gửi hàng loạt thật tới người lạ** cho tới khi xác minh domain riêng).
3. **Lấy Segment ID** (Resend → Audiences → segment mặc định "General" → xem URL có
   `?segmentId=...`). Tài khoản hiện tại có sẵn: `b9c64daa-85fb-42b4-9024-3715ea27eb70`
   (dùng làm giá trị `RESEND_SEGMENT_ID` bên dưới nếu muốn gửi cho toàn bộ danh bạ).
4. **Tạo API Key** (Resend → API Keys → Create API Key, quyền "Full access" hoặc "Sending
   access" đều được) → copy key (dạng `re_...`) — **đã tạo 1 key tên `netlify-tuyentruyen`**,
   giá trị đã được copy vào clipboard trình duyệt lúc thiết lập; nếu đã mất, vào lại
   Resend → API Keys để tạo key mới (giá trị cũ không xem lại được, phải tạo mới).
5. **Thêm biến môi trường trong Netlify** (Site configuration → Environment variables):

   | Tên biến | Giá trị |
   |---|---|
   | `RESEND_API_KEY` | API key bước 4 — **dán trực tiếp trong Netlify UI, không nhờ AI dán hộ** |
   | `RESEND_SEGMENT_ID` | Segment ID bước 3 (vd `b9c64daa-85fb-42b4-9024-3715ea27eb70` cho segment "General") |
   | `NEWSLETTER_FROM` | Vd `"Cẩm nang An toàn số <noreply@tuyentruyen.khoaktt.vn>"` (phải đúng domain đã xác minh ở bước 2, hoặc dùng `onboarding@resend.dev` nếu đang thử nghiệm) |
   | `ADMIN_EMAIL` | Email admin nhận bản nháp để duyệt (vd `vuongppa@gmail.com`) |
   | `NEWSLETTER_SIGNING_SECRET` | 1 chuỗi ngẫu nhiên dài tự đặt (vd chạy `openssl rand -hex 32`) — **giữ bí mật**, dùng để ký link duyệt |
   | `COMPOSE_SECRET` | 1 chuỗi ngẫu nhiên khác — dùng làm "mật khẩu" trong URL soạn bản tin, tránh người ngoài gọi được endpoint này |

6. **Bật webhook cho form đăng ký** (Site configuration → Forms → Form notifications →
   Add notification → Outgoing webhook): chọn form `dang-ky-ban-tin`, URL điền
   `https://tuyentruyen.khoaktt.vn/.netlify/functions/on-subscribe`.
7. **Deploy lại** (biến môi trường mới chỉ áp dụng từ lần deploy sau khi thêm).
8. **Test**: tự đăng ký bằng email của mình ở form trên trang → phải nhận được email chào
   mừng trong vài giây, và email đó xuất hiện trong Resend → Audiences → General. Sau đó
   truy cập
   `https://tuyentruyen.khoaktt.vn/.netlify/functions/compose-newsletter?secret=<COMPOSE_SECRET>`
   → phải nhận được email bản nháp ở `ADMIN_EMAIL` → bấm nút "Duyệt & Gửi" → phải nhận
   được bản tin thật ở chính email vừa đăng ký (vì đó là người duy nhất trong segment lúc
   test — nếu chưa xác minh domain, Resend chỉ cho gửi tới email chủ tài khoản, nên dùng
   đúng email đã đăng ký Resend để test).

### Lưu ý quan trọng

- **Chưa có lịch tự động (cron)** — soạn bản tin là hành động ADMIN TỰ BẤM khi có nội
  dung muốn gửi, đúng theo yêu cầu "cần gửi cho admin trước để kiểm duyệt". Nếu sau này
  muốn tự động theo lịch (vd đầu tháng), có thể thêm Netlify Scheduled Function gọi
  `compose-newsletter` định kỳ — chưa làm vì cần quyết định tần suất/nguồn nội dung cụ
  thể trước.
- **Nội dung bản nháp chỉ lấy sự kiện đã có `body`** (không lấy sự kiện auto-feed từ
  hvcsnd.edu.vn) — nếu 1 kỳ không có sự kiện thật nào mới đủ nội dung, function trả về
  thông báo "không có gì để gửi" thay vì gửi bản tin rỗng.
- **Chưa test đầu-cuối với dữ liệu thật** — API key vừa tạo chưa được dán vào Netlify env
  vars, nên luồng chào mừng/duyệt/gửi hàng loạt chưa chạy thử thật lần nào. Cấu trúc
  request đã đối chiếu trực tiếp với tài liệu API-docs hiển thị trong tài khoản Resend
  thật (Contacts API + Broadcasts API), không còn dựa trên phỏng đoán.
- Gói Resend free: 3.000 email/tháng, 100 email/ngày — đủ dùng cho quy mô 1 khoa, nếu
  vượt cần nâng cấp gói trả phí của Resend (không liên quan credit Netlify).

## Quy trình test local

```bash
node scripts/build-events.js && node scripts/build-ticker.js && node scripts/build-about.js && node scripts/build-site.js && node scripts/build-skills.js
python -m http.server 8990
```

Mở `http://localhost:8990`. **`/admin` KHÔNG hoạt động ở local** — phụ thuộc Netlify
Identity + Git Gateway thật, chỉ dùng được trên domain đã deploy.

Cách nhanh: bấm đúp **Chay-thu.bat** ở thư mục gốc (tự build + mở server +
mở trình duyệt).
