# Cẩm nang An toàn số

Website tuyên truyền an ninh mạng / chuyển đổi số của Khoa Toán - Tin học và Ứng dụng
KHCN, Học viện CSND. Live tại **https://tuyentruyen.khoaktt.vn/**, quản trị nội dung
tại `/admin` ([Decap CMS](https://decapcms.org/), lưu thẳng vào GitHub dạng JSON).

**Muốn hiểu kiến trúc/tính năng hoặc đang vận hành, sửa lỗi?** Đọc `docs/` trước, file
này chỉ còn phần thiết lập ban đầu (đã làm 1 lần) + cách thêm nội dung khi offline:

- [docs/PROJECT.md](docs/PROJECT.md) — kiến trúc, luồng dữ liệu, bản đồ tính năng.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Netlify, CSP, sự cố đã gặp và cách sửa.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — nhật ký thay đổi theo ngày.

## Thiết lập ban đầu (đã hoàn tất trên site hiện tại — giữ lại để tham khảo)

### 1. Đẩy code lên GitHub

```bash
git init -b main
git add .
git commit -m "Khởi tạo website timeline tuyên truyền An ninh mạng"
```

Tạo repo trống trên GitHub (không thêm README/gitignore), rồi:

```bash
git remote add origin https://github.com/<ban>/<ten-repo>.git
git push -u origin main
```

### 2. Kết nối Netlify

1. Đăng nhập [Netlify](https://app.netlify.com) bằng tài khoản GitHub của bạn.
2. **Add new site → Import an existing project → GitHub** → chọn repo vừa tạo.
3. Build command và publish directory đã có sẵn trong `netlify.toml`, Netlify tự nhận.
4. Deploy site.

### 3. Bật Netlify Identity + Git Gateway (bắt buộc để `/admin` hoạt động)

1. Vào **Site configuration → Identity → Enable Identity**.
2. **Identity → Registration**: chọn **Invite only** (không cho ai tự đăng ký).
3. **Identity → Services → Git Gateway → Enable Git Gateway** (cho phép Identity
   commit thay bạn vào repo GitHub mà không cần cấp token cá nhân cho CMS).
4. **Identity → Invite users** → nhập đúng email quản trị của bạn. Chỉ email được mời
   mới đăng nhập được.

#### Tuỳ chọn: đăng nhập bằng đúng tài khoản GitHub thay vì email/mật khẩu

1. Tạo GitHub OAuth App tại **GitHub → Settings → Developer settings → OAuth Apps →
   New OAuth App**: Homepage URL `https://<ten-site>.netlify.app`, Authorization
   callback URL `https://api.netlify.com/auth/done`.
2. Copy **Client ID** và **Client Secret** vào Netlify: **Identity → Services →
   External providers → GitHub**.

## Thêm/sửa nội dung

### Bình thường (đã deploy, có mạng)

Dùng `/admin`. Mỗi lần lưu, Decap CMS commit thẳng vào GitHub → Netlify tự build lại
→ trang cập nhật sau ~1 phút (trừ khi hết credit build, xem
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)). Đổi mật khẩu tại
[/admin/doi-mat-khau.html](/admin/doi-mat-khau.html).

### Khi offline / chưa deploy

`/admin` cần Netlify Identity thật nên **không hoạt động offline**. Thay vào đó:

- **Thêm 1 hoạt động**: bấm đúp **Them-su-kien.bat** (chạy `scripts/add-event.js`)
  — CLI hỏi lần lượt tiêu đề, phân loại, ngày, địa điểm, nội dung, ảnh (đường dẫn file
  trên máy, tự copy vào `uploads/`), link tham khảo, link video. Ghi thẳng vào
  `content/events/*.json`, tự cập nhật `data/events.json` — F5 lại trang xem thử.
- **Thêm nhiều hoạt động cùng lúc (tiết kiệm credit Netlify — mỗi lần push/lưu qua
  `/admin` tốn 15 credit, xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))**: điền nhiều
  dòng vào `uploads/mau-nhap-hoat-dong.xlsx`, thả ảnh minh chứng vào thư mục
  `Anh-nhap-hoat-dong/` (đặt tên `<Ngày dạng YYYYMMDD>-<STT>-<số ảnh>.jpg`, hướng dẫn
  chi tiết trong file `HUONG-DAN-DAT-TEN-ANH.txt` ở chính thư mục đó), rồi bấm đúp
  **Nhap-hang-loat.bat** (chạy `scripts/import-events-xlsx.js`) — tạo hết các hoạt động
  cùng lúc thành file riêng trong `content/events/`, chỉ cần push 1 lần cho tất cả.
  **Cách khác, làm qua web** (không cần ngồi máy này): `/admin` → "Nhập hàng loạt
  (Excel)" → tải file `.xlsx` lên, tải ảnh lên qua tab Media (đặt tên đúng quy ước) —
  trang tự đọc lại ở mỗi lần build, ảnh tải lên sau sẽ tự được ghép vào lần build kế
  tiếp. **Chỉ nên xử lý 1 lô tại 1 thời điểm** — nhờ Claude "chốt" lô hiện tại thành
  file riêng trước khi tải lô Excel mới lên (nếu không, lô cũ sẽ biến mất khi lô mới
  thay thế, vì lô qua web chưa từng được ghi thành file riêng).
- **Sửa Header/Hero/Footer/Giới thiệu**: sửa trực tiếp `content/site.json` /
  `content/gioi-thieu.json` bằng tay (đúng field name trong `admin/config.yml`), rồi
  chạy lại `node scripts/build-site.js` / `node scripts/build-about.js`.
- Khi có mạng trở lại: `git add -A && git commit -m "..." && git push` (hoặc nhờ
  Claude làm hộ trong phiên chat) để đồng bộ lên GitHub/Netlify.

## Xem thử ở máy local

Bấm đúp **[Chay-thu.bat](Chay-thu.bat)**, hoặc chạy tay:

```bash
node scripts/build-events.js && node scripts/build-ticker.js && node scripts/build-about.js && node scripts/build-site.js && node scripts/build-skills.js
python -m http.server 8990
```

Mở `http://localhost:8990`. (`/admin` không hoạt động ở local — xem ở trên.)

## Thống kê lượt truy cập

Đã bật (GoatCounter, site code `vuongnq`), không cần làm gì thêm. Cách hoạt động và
cách bật ô "Lượt truy cập" công khai trên trang: xem
[docs/PROJECT.md](docs/PROJECT.md) mục "Lượt truy cập".

## Ghi chú bảo mật

- `netlify.toml` đặt Content-Security-Policy chặt cho toàn site; chỉ `/admin/*` được
  nới để tải Decap CMS + Netlify Identity từ CDN chính chủ (chi tiết + lý do từng dòng:
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
- `scripts/build-events.js` escape HTML và chỉ whitelist một tập thẻ markdown cơ bản
  khi dựng `bodyHtml`, chặn chèn script từ nội dung nhập trong CMS.
- Ảnh chỉ được chấp nhận nếu nằm trong `/uploads/` (do chính Git Gateway ghi vào),
  link tham khảo chỉ được chấp nhận nếu bắt đầu bằng `http://`/`https://`.
- Không có tài khoản nào đăng ký tự do — **Invite only** + (tùy chọn) GitHub OAuth
  giới hạn admin đúng 1 người.
