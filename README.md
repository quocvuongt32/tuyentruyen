# Cẩm nang An toàn số

Website chuyên đề tuyên truyền, phổ biến kiến thức và kỹ năng an toàn số của
Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP, Học viện Cảnh sát nhân dân.

Website chính: **https://tuyentruyen.khoaktt.vn/**.

## Nguyên tắc nội dung

- Nội dung công khai do Khoa biên soạn, quản lý hoặc được giao thực hiện.
- Không tự động tải nội dung biên tập từ website bên ngoài để đăng lại.
- Khu vực nguồn chính thống chỉ chứa liên kết tĩnh tới cơ quan; liên kết tham khảo
  cuối bài phục vụ đối chiếu với nội dung gốc.
- Không có tài khoản công khai, bình luận, diễn đàn, đăng bài cộng đồng hoặc biểu mẫu
  thu thập email.

## Kiến trúc

```text
content/*.json
      │  npm run build
      ▼
data/*.json + trang HTML + tài sản được tham chiếu
      │
      ▼
dist/  → Cloudflare Pages
```

- Node.js 24 LTS, HTML/CSS/JavaScript thuần.
- Chỉ `dist/` được xuất bản; công cụ biên tập, tài khoản và dữ liệu nguồn không được
  đưa lên website công khai.
- `content/site.json` cấu hình định danh, liên kết chính thống và chân trang.
- `_headers` giới hạn nguồn tài nguyên được phép tải trên trình duyệt.

## Cổng biên tập `/admin`

Truy cập `https://tuyentruyen.khoaktt.vn/admin` hoặc bấm đúp `Dang-bai.bat` để mở
cổng quản trị trực tuyến. Tài khoản và bài viết được lưu trong Cloudflare D1; ảnh đã
tối ưu được lưu trong kho KV riêng, không nhúng mật khẩu hoặc ảnh bản thảo vào Git.

Ba tài khoản khởi tạo:

- `admin`: quản trị toàn quyền, có thể soạn, gửi duyệt, thẩm định, đăng và quản lý tài khoản.
- `nganpt`: Thượng tá Phạm Thị Ngân, có quyền thẩm định và đăng bài.
- `vuongnq`: Đại úy Nguyễn Quốc Vương, có quyền soạn và gửi bài đi duyệt.

Người dùng phải đổi mật khẩu tạm ngay lần đăng nhập đầu. Hệ thống chỉ lưu bản băm
PBKDF2 của mật khẩu. Mật khẩu tạm ban đầu chỉ được giữ trong tệp cục bộ
`.publisher/cloud-initial-credentials.txt`, không được đưa vào Git.

Trình soạn thảo hoạt động gần giống Word: định dạng đoạn, chữ đậm/nghiêng/gạch chân,
danh sách, căn lề, liên kết, ảnh chen giữa nội dung, chú thích ảnh và thư viện ảnh tư
liệu cuối bài. Khi xuất bản, tiêu đề hiển thị chữ hoa đậm, tóm tắt đậm nghiêng, nội
dung chữ thường, chú thích ảnh nghiêng màu xanh lá và tên tác giả ở góc dưới bên phải.

Quy trình chuẩn:

```text
DRAFT → REVIEW → APPROVED → PUBLISHED
```

Tài khoản soạn bài thông thường không thể tự duyệt. Theo yêu cầu vận hành, tài khoản
`admin` là ngoại lệ có toàn quyền; thao tác vẫn được ghi vào lịch sử quy trình.

Ảnh JPG/PNG/WebP gốc tới 250 MB được chuẩn hóa thành JPEG, cạnh dài tối đa 1.920 px
và điều chỉnh chất lượng theo dung lượng mục tiêu mà vẫn ưu tiên độ nét.

## Kiểm tra

```powershell
npm run test:publisher
npm run build
npm run check
```

Đọc thêm tại [docs/PROJECT.md](docs/PROJECT.md),
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) và [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Bảo mật và dữ liệu cá nhân

- Không có biểu mẫu đăng ký bản tin hoặc trường nhập email trên website công khai.
- Cổng biên tập dùng HTTPS, phiên ngẫu nhiên, cookie `HttpOnly`, CSRF token, giới hạn
  lần đăng nhập sai và phân quyền phía máy chủ.
- Nội dung giàu định dạng được chuẩn hóa thành các khối an toàn; liên kết chỉ nhận
  `http/https`, ảnh chỉ nhận tệp trong `uploads/`.
- Liên kết ngoài mở tab mới với `noopener noreferrer`.
- Website không dùng dịch vụ phân tích hoặc bộ đếm truy cập bên thứ ba.
