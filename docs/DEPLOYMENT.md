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

## ⚠️ Tình trạng credit Netlify (free tier) — cập nhật 19/8/2026

Gói **Free**, 300 credits/tháng. **Chu kỳ hiện tại: 18/8 → 17/9/2026.** Đã dùng hết
credit build trong ngày 19/8/2026 (do đẩy rất nhiều commit liên tiếp trong 1 buổi làm
việc — mỗi push = 1 lần build tốn credit). Từ đó **mọi deploy production đều bị
Netlify tự động Skip** — đã xác minh:

- Deploy tự động khi push lên GitHub → bị skip, lý do hiển thị trong tab Deploys:
  `"Skipped due to account credit usage exceeded"`.
- Đã thử `netlify deploy --prod` (CLI, build sẵn ở máy local, upload thẳng bỏ qua
  bước build trên Netlify) → **cũng bị chặn**, lỗi `403 Forbidden`. Vậy giới hạn áp
  dụng cho **toàn bộ hành động production deploy của tài khoản**, không riêng gì
  build tự động từ Git.
- Trang public **vẫn sống bình thường** trong lúc bị chặn — Netlify chỉ dừng
  **xuất bản bản mới**, không tắt site đang chạy.

**Cách xử lý**: chờ đến 17/9/2026 (credit tự làm mới, mọi commit đã tích luỹ sẽ lên
live cùng lúc ở lần build thành công đầu tiên — không mất gì), hoặc chủ tài khoản tự
nâng cấp gói trong Netlify Dashboard → Usage & billing nếu cần gấp trước đó.

**Không nên**: tạo tài khoản Netlify mới để né giới hạn — phải cấu hình lại domain/SSL
+ Netlify Identity + Git Gateway từ đầu (toàn bộ hệ thống đăng nhập `/admin` phụ thuộc
site cụ thể này), rủi ro cao ngay trước deadline, và thường vi phạm điều khoản dịch vụ
free-tier của Netlify.

**Kiểm tra trạng thái build hiện tại** (khi cần, không cần đăng nhập lại nếu trình
duyệt đã có sẵn phiên Netlify): `https://app.netlify.com/teams/quocvuongt32/projects` →
chọn site → tab **Deploys**.

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
