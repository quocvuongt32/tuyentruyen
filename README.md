# Cẩm nang An toàn số

Website tuyên truyền an ninh mạng và chuyển đổi số của Khoa Toán - Tin học và Ứng dụng
KHCN, Học viện CSND. Website chính: **https://tuyentruyen.khoaktt.vn/**.

Site chạy trên Cloudflare Pages, nội dung được quản lý bằng các file JSON trong `content/`
và cập nhật bằng script tại máy. `/admin` cũ đã ngừng sử dụng.

## Kiến trúc nhanh

```text
content/*.json
      │  npm run build
      ▼
data/*.json + index.html + css/ + js/ + ảnh được tham chiếu
      │
      ▼
dist/  → Cloudflare Pages
```

- Node.js 24 LTS, không có dependency npm ngoài.
- Frontend HTML/CSS/JavaScript thuần, tách theo chức năng trong `js/` và `css/`.
- Form góp ý dùng Web3Forms.
- Đăng ký bản tin gọi Cloudflare Pages Function `/api/newsletter/subscribe`, lưu contact
  thật vào Resend và gắn vào segment bản tin.
- Tin RSS có bản dự phòng tại `content/ticker-fallback.json` để không bị rỗng khi nguồn lỗi.
- Khối **Tin nhanh & số liệu mới** gọi Pages Function `/api/quick-news`, tự làm mới từ
  chuyên mục chính thức của Bộ Công an và Báo điện tử Chính phủ, lưu đệm 6 giờ.
- Chỉ `dist/` được xuất bản; tài liệu, script, JSON nguồn và cấu hình nội bộ không được đưa
  lên website.

Đọc thêm:

- [docs/PROJECT.md](docs/PROJECT.md) — kiến trúc và bản đồ tính năng.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — triển khai Cloudflare, CSP và bản tin.
- [docs/PUBLISHING.md](docs/PUBLISHING.md) — quy trình đăng bài hiện tại và phương án
  tạo URL riêng để chia sẻ.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — nhật ký thay đổi.

## Thêm/sửa nội dung

- Cách dễ nhất: bấm đúp `Dang-bai.bat`, soạn bài, chọn ảnh, xem trước rồi đăng. Công cụ
  tự tối ưu/kiểm tra ảnh, build/check, tạo commit riêng và trả về URL để chia sẻ.
- Bài chọn **Chương trình tuyên truyền** mặc định được đưa thẳng vào dòng thời gian
  `Tuyên truyền An ninh mạng`; có thể đổi sang khu vực `Hoạt động khác` ngay trên form.
- Cách dòng lệnh cũ: thêm một hoạt động bằng `Them-su-kien.bat`.
- Nhập nhiều hoạt động: điền `uploads/mau-nhap-hoat-dong.xlsx`, đặt ảnh nguồn vào
  `Anh-nhap-hoat-dong/`, rồi chạy `Nhap-hang-loat.bat`.
- Sửa nội dung chung: chỉnh `content/site.json` và `content/gioi-thieu.json`.
- Sửa bài/kỹ năng: chỉnh các file trong `content/ky-nang/`.

Mỗi hoạt động và kỹ năng nội bộ có trang URL riêng tại `/hoat-dong/<slug>/` hoặc
`/ky-nang/<slug>/`, kèm metadata Open Graph để chia sẻ. Xem [hướng dẫn đăng bài](docs/PUBLISHING.md).

Sau khi thay đổi, chạy:

```powershell
npm run build
npm run check
```

## Xem thử tại máy

Chạy `Chay-thu.bat`, hoặc:

```powershell
npm run build
python -m http.server 8990 --directory dist
```

Mở `http://localhost:8990`.

## Triển khai Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `24`
- `wrangler.toml` cũng khai báo `pages_build_output_dir = "./dist"`.
- Pages Functions nằm trong `functions/` và không được copy vào `dist/`.

Các biến môi trường cần đặt trong Cloudflare Pages:

| Biến | Công dụng |
|---|---|
| `RESEND_API_KEY` | API key của Resend |
| `RESEND_SEGMENT_ID` | Segment nhận người đăng ký bản tin |
| `NEWSLETTER_FROM` | Địa chỉ gửi đã xác minh, ví dụ `Cẩm nang An toàn số <noreply@tuyentruyen.khoaktt.vn>` |

Không đưa các giá trị bí mật vào Git.

## Sao lưu

- Chạy `npm run backup` để tạo ZIP trong `backups/` tại máy.
- GitHub Actions chạy hằng tuần và lưu artifact `content/`, `uploads/`, `img/` trong 90 ngày.
- Có thể chạy thủ công workflow **Sao lưu nội dung** từ tab Actions.

## Bảo mật

- CSP chỉ cho iframe YouTube/Vimeo; mọi liên kết tham khảo khác mở tab mới với
  `noopener noreferrer`.
- Nội dung Markdown được escape/whitelist trong `scripts/build-events.js`.
- Ảnh sự kiện chỉ nhận đường dẫn trong `/uploads/`; link chỉ nhận HTTP/HTTPS.
- `_headers` bật CSP, HSTS, `X-Frame-Options`, `nosniff` và `Referrer-Policy`.
