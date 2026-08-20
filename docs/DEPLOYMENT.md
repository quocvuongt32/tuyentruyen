# Vận hành & Deploy

> Đọc [PROJECT.md](PROJECT.md) trước để hiểu kiến trúc. File này là phần "vận hành":
> Netlify, CSP, và các sự cố đã gặp + cách đã sửa (để không lặp lại).

## Thông tin hạ tầng

- **Domain**: tuyentruyen.khoaktt.vn — DNS ở Cloudflare, **DNS-only (không proxy)**,
  Netlify phục vụ trực tiếp (đã xác minh header `Server: Netlify`, không phải
  `cloudflare` — nên không có tầng cache Cloudflare xen giữa cần lo).
- **Netlify site**: `rainbow-seahorse-1aa78d` (tên nội bộ Netlify), team `quocvuongt32`,
  chủ tài khoản email `vuongppa@gmail.com`.
- **Repo GitHub**: `quocvuongt32/tuyentruyen`, branch `main`, Netlify build tự động
  mỗi khi push (`Auto publishing is on`) — **trừ khi hết credit, xem mục dưới**.
- **Build command** (trong `netlify.toml`):
  ```
  node scripts/build-events.js && node scripts/build-ticker.js && node scripts/build-about.js && node scripts/build-site.js
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

## Quy trình test local

```bash
node scripts/build-events.js && node scripts/build-ticker.js && node scripts/build-about.js && node scripts/build-site.js
python -m http.server 8990
```

Mở `http://localhost:8990`. **`/admin` KHÔNG hoạt động ở local** — phụ thuộc Netlify
Identity + Git Gateway thật, chỉ dùng được trên domain đã deploy.

Cách nhanh: bấm đúp **Chay-thu.bat** ở thư mục gốc (tự build + mở server +
mở trình duyệt).
