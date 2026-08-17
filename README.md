# Hồ sơ tuyên truyền An ninh mạng — Timeline

Website tĩnh (HTML/CSS/JS thuần, không framework) hiển thị dòng thời gian các buổi
tuyên truyền An ninh mạng. Nội dung được quản lý qua [Decap CMS](https://decapcms.org/)
tại `/admin`, lưu trực tiếp vào GitHub dưới dạng file JSON.

## Kiến trúc

```
index.html, css/, js/      → trang public, 100% tĩnh, không gọi CDN, không server
content/events/*.json      → mỗi file = 1 sự kiện, do Decap CMS hoặc scripts/add-event.js tạo/sửa/xóa
scripts/build-events.js    → gộp content/events/*.json → data/events.json (chạy khi Netlify build)
scripts/add-event.js       → CLI thêm sự kiện khi thử ở máy local (xem mục 6)
Chay-thu.bat                → bấm đúp để chạy thử web ở máy local
Them-su-kien.bat            → bấm đúp để thêm sự kiện khi thử ở máy local
admin/                     → giao diện Decap CMS (chỉ trang này gọi CDN + Netlify Identity)
uploads/                   → ảnh minh chứng do Decap CMS / scripts/add-event.js tải lên
netlify.toml                → cấu hình build + security headers (CSP, X-Frame-Options,…)
```

Trang public không có bất kỳ logic ghi/xóa nào — CRUD chỉ xảy ra qua `/admin`,
được xác thực bởi Netlify Identity + Git Gateway. Vì vậy bề mặt tấn công phía
người dùng gần như bằng 0 (không database, không API tự viết, không cổng backend).

## 1. Đẩy code lên GitHub

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

## 2. Kết nối Netlify

1. Đăng nhập [Netlify](https://app.netlify.com) bằng tài khoản GitHub của bạn.
2. **Add new site → Import an existing project → GitHub** → chọn repo vừa tạo.
3. Build command: `node scripts/build-events.js` — Publish directory: `.`
   (đã có sẵn trong `netlify.toml`, Netlify sẽ tự nhận).
4. Deploy site.

## 3. Bật Netlify Identity + Git Gateway (bắt buộc để `/admin` hoạt động)

1. Vào **Site configuration → Identity → Enable Identity**.
2. **Identity → Registration**: chọn **Invite only** (không cho ai tự đăng ký).
3. **Identity → Services → Git Gateway → Enable Git Gateway** (cho phép Identity
   commit thay bạn vào repo GitHub mà không cần cấp token cá nhân cho CMS).
4. **Identity → Invite users** → nhập **đúng email quản trị của bạn**
   (vd. địa chỉ Gmail bạn dùng để đăng nhập). Chỉ email được mời mới đăng nhập được —
   đây là cơ chế giới hạn "chỉ duy nhất tài khoản của tôi" theo yêu cầu bảo mật.

### Tùy chọn: đăng nhập bằng đúng tài khoản GitHub của bạn thay vì email/mật khẩu

1. Tạo GitHub OAuth App tại **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**:
   - Homepage URL: `https://<ten-site>.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Copy **Client ID** và **Client Secret** vào Netlify:
   **Identity → Services → External providers → GitHub**.
3. Khi đó nút đăng nhập ở `/admin` sẽ dùng OAuth GitHub — chỉ tài khoản GitHub được
   bạn mời (bước 4 ở trên, dùng email gắn với tài khoản GitHub đó) mới vào được.

## 4. Sử dụng trang quản trị

Truy cập `https://<ten-site>.netlify.app/admin/`, đăng nhập bằng tài khoản đã mời,
thêm/sửa/xóa sự kiện trong collection **"Sự kiện tuyên truyền"**. Mỗi lần lưu,
Decap CMS commit thẳng vào `content/events/` trên GitHub → Netlify tự động build lại
(`scripts/build-events.js` gộp dữ liệu) → trang timeline cập nhật sau ~1 phút.

Có thể xóa sự kiện mẫu `content/events/2026-08-17-buoi-tuyen-truyen-mau.json` ngay
trong `/admin` sau khi thử.

`/admin` chỉ hoạt động **sau khi đã deploy lên Netlify và bật Identity + Git Gateway**
(mục 3) — chạy ở máy local (`localhost`) sẽ không đăng nhập được vì không có backend
Identity thật đứng sau. Kéo-thả ảnh vào ô ảnh (image widget) đã được Decap CMS hỗ trợ
sẵn, không cần thêm gì. Việc sắp xếp lại thứ tự sự kiện bằng kéo-thả thì Decap CMS
không hỗ trợ cho loại collection dạng thư mục (mỗi sự kiện 1 file) như ở đây — thứ tự
hiển thị trên trang là tự động theo `date` mới nhất lên đầu; trong `/admin` có thể bấm
tiêu đề cột **Date/Title** ở danh sách để sắp xếp lại cách xem, không phải kéo-thả.

### Đổi mật khẩu

Vào **[Đổi mật khẩu](/admin/doi-mat-khau.html)** (cũng có link ở menu chính) — đăng
nhập bằng tài khoản Identity, tự nhập mật khẩu mới. Trang này gọi thẳng API của
Netlify Identity từ trình duyệt của bạn; mật khẩu không đi qua hay lưu ở bất kỳ đâu
khác ngoài chính tài khoản Identity của bạn.

## 5. Xem thử ở máy local

Cách nhanh nhất: bấm đúp file **[Chay-thu.bat](Chay-thu.bat)**. Script sẽ tự cập nhật
dữ liệu, mở server tại `http://localhost:8990` và mở trình duyệt sẵn cho bạn.
Đóng cửa sổ cmd hiện ra (tên "TUYEN_TRUYEN - server") để tắt server.

Chạy tay tương đương:

```bash
node scripts/build-events.js
python -m http.server 8990
```

Mở `http://localhost:8990`. (Trang `/admin` cần chạy trên Netlify vì phụ thuộc
Identity + Git Gateway — không hoạt động đầy đủ ở local.)

## 6. Thêm sự kiện

- **Đã deploy lên Netlify**: dùng `/admin` (Decap CMS) như mục 4 — thao tác từ xa,
  nhiều thiết bị, có xác thực Identity.
- **Đang thử ở máy local, chưa deploy**: bấm đúp **[Them-su-kien.bat](Them-su-kien.bat)**
  (chạy `scripts/add-event.js`). Cửa sổ cmd sẽ hỏi lần lượt: tiêu đề, ngày, địa điểm,
  nội dung (kết thúc bằng dòng chỉ có dấu `.`), đường dẫn ảnh trên máy (cách nhau bằng
  dấu phẩy, ảnh sẽ được copy vào `uploads/`), và link tham khảo. Script tự ghi file vào
  `content/events/` và cập nhật lại `data/events.json` — chỉ cần F5 lại trang đang xem thử.

## 7. Xem link tham khảo ngay trong trang

Bấm "Xem bài viết tham khảo" mở một cửa sổ (modal) nhúng trang đó bằng `<iframe>` ngay
trong web, không mở tab mới. **Lưu ý:** nhiều trang (Facebook, báo điện tử,…) tự chặn bị
nhúng bằng header `X-Frame-Options`/`frame-ancestors` — đây là cơ chế bảo mật của chính
trang đó, không thể và không nên can thiệp để vượt qua. Khi gặp trường hợp này, modal sẽ
trống hoặc báo lỗi; dùng nút "Mở tab mới ↗" ở góc modal để xem bình thường.

## 8. Banner ảnh nổi bật ở trang chủ

Trong `/admin` (hoặc `Them-su-kien.bat`), mỗi ảnh minh chứng của một sự kiện có thể
đánh dấu **"Ảnh nổi bật"**. Trang chủ sẽ gom tất cả ảnh được đánh dấu (từ mọi sự kiện)
thành banner tự động chuyển ảnh mỗi 3 giây, có dấu chấm điều hướng, bấm vào ảnh sẽ
cuộn xuống và mở đúng sự kiện chứa ảnh đó trong dòng thời gian. Không tạo hệ thống
upload riêng — dùng lại `uploads/` sẵn có. Nếu chưa có ảnh nào được đánh dấu, khu vực
banner tự ẩn hoàn toàn, không chừa khoảng trắng.

Khu vực thống kê ngay dưới banner (số buổi tuyên truyền, số ảnh minh chứng, thời gian
cập nhật gần nhất) được tính tự động từ `content/events/*.json` mỗi lần build, không
cần nhập tay.

## Ghi chú bảo mật

- `netlify.toml` đặt Content-Security-Policy chặt cho toàn site; chỉ `/admin/*`
  được nới để tải Decap CMS + Netlify Identity từ CDN chính chủ.
- `scripts/build-events.js` escape HTML và chỉ whitelist một tập thẻ markdown cơ bản
  khi dựng `bodyHtml`, chặn chèn script từ nội dung nhập trong CMS.
- Ảnh chỉ được chấp nhận nếu nằm trong `/uploads/` (do chính Git Gateway ghi vào),
  link tham khảo chỉ được chấp nhận nếu bắt đầu bằng `http://`/`https://`.
- Không có tài khoản nào đăng ký tự do — **Invite only** + (tùy chọn) GitHub OAuth
  giới hạn admin đúng 1 người.
