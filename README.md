# Cẩm nang An toàn số

Website chuyên đề tuyên truyền, phổ biến kiến thức và kỹ năng an toàn số của
Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP, Học viện Cảnh sát nhân dân.

Website chính: **https://tuyentruyen.khoaktt.vn/**.

## Nguyên tắc nội dung

- Nội dung công khai do Khoa biên soạn, quản lý hoặc được giao thực hiện.
- Không tự động tải nội dung biên tập từ website bên ngoài để đăng lại.
- Khu vực nguồn tham khảo chỉ chứa liên kết tĩnh tới Bộ Công an, Cục A05 và Học
  viện CSND; liên kết cuối bài phục vụ đối chiếu với nội dung gốc.
- Không có tài khoản công khai, bình luận, diễn đàn, đăng bài cộng đồng hoặc biểu mẫu
  thu thập email.
- Có bộ đếm truy cập ẩn danh, danh sách bài xem nhiều và biểu mẫu góp ý không yêu
  cầu họ tên, email.
- Thanh đầu trang hiển thị thời tiết Hà Nội, thời gian GMT+7 và chạy 7 bài hoạt động mới nhất
  của chính website; không lấy tiêu đề hay nội dung tin từ trang ngoài.

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

- `admin`: quản trị toàn quyền, có thể soạn, gửi duyệt, thẩm định, đăng, tạo và quản lý tài khoản, xử lý tin nhắn góp ý, chỉnh chữ Trang chủ và quản lý banner.
- `nganpt`: Thượng tá Phạm Thị Ngân, có quyền thẩm định và đăng bài.
- `vuongnq`: Đại úy Nguyễn Quốc Vương, có quyền soạn và gửi bài đi duyệt.

Người dùng phải đổi mật khẩu tạm ngay lần đăng nhập đầu. Hệ thống chỉ lưu bản băm
PBKDF2 của mật khẩu. Mật khẩu tạm ban đầu chỉ được giữ trong tệp cục bộ
`.publisher/cloud-initial-credentials.txt`, không được đưa vào Git.

Trình soạn thảo hoạt động gần giống Word: định dạng đoạn, chữ đậm/nghiêng/gạch chân,
danh sách, căn lề, liên kết, ảnh chen giữa nội dung, chú thích ảnh và thư viện ảnh tư
liệu cuối bài. Khi xuất bản, tiêu đề hiển thị chữ hoa đậm, tóm tắt đậm nghiêng, nội
dung chữ thường, chú thích ảnh nghiêng màu xanh lá và tên tác giả ở góc dưới bên phải.
Tiêu đề và tóm tắt có thể căn trái, giữa, phải hoặc đều hai bên; mặc định là căn đều.

Trong mục **Quản lý bài đã đăng**, tài khoản `admin` xem được cả bài có sẵn và bài đăng
qua cổng quản trị, có thể mở sửa, xóa khỏi website hoặc kéo thả để quyết định thứ tự hiển thị.

Trong mục **Chỉnh chữ Trang chủ**, admin thay đổi văn bản thuần theo từng nhóm: nhận diện/menu,
banner mở đầu, giới thiệu, nguồn tham khảo, các khu vực nội dung và liên hệ/thống kê. Nội dung được
lưu trong D1, không cần sửa mã nguồn và không nhận HTML. Mục **Quản lý tài khoản** cho phép tạo
người dùng mới, gán vai trò và cấp mật khẩu tạm bắt buộc đổi ở lần đăng nhập đầu.

Quy trình chuẩn:

```text
DRAFT → REVIEW → APPROVED → PUBLISHED
```

Tài khoản soạn bài thông thường không thể tự duyệt. Theo yêu cầu vận hành, tài khoản
`admin` là ngoại lệ có toàn quyền; thao tác vẫn được ghi vào lịch sử quy trình.

Ảnh JPG/PNG/WebP gốc tới 250 MB được chuẩn hóa thành JPEG, cạnh dài tối đa 1.920 px
và điều chỉnh chất lượng theo dung lượng mục tiêu mà vẫn ưu tiên độ nét.

Trong mục **Banner trang chủ**, admin có thể thêm hoặc xóa ảnh đang chạy và đặt thời
gian hiển thị mỗi ảnh từ 2 đến 20 giây. Danh sách banner và tốc độ được lưu trong D1;
ảnh tải mới được tối ưu rồi lưu trong KV.

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
- Thống kê truy cập dùng mã phiên ngẫu nhiên ẩn danh do trình duyệt tạo; website
  không đưa IP, họ tên hoặc email vào cơ sở dữ liệu thống kê.
- Tin nhắn góp ý chỉ lưu nội dung và mã chống lạm dụng đã băm; quản trị viên kiểm tra
  trong mục **Hộp thư góp ý**, có thể đánh dấu đã đọc hoặc xóa tại `/admin`.
- Nội dung giàu định dạng được chuẩn hóa thành các khối an toàn; liên kết chỉ nhận
  `http/https`, ảnh chỉ nhận tệp trong `uploads/`.
- Liên kết ngoài mở tab mới với `noopener noreferrer`.
- Website tự thống kê trên Cloudflare D1, không dùng dịch vụ phân tích hoặc bộ đếm
  truy cập bên thứ ba.
- Tổng truy cập D1 đã kế thừa 4.155 lượt lịch sử do bộ đếm cũ ghi nhận; các lượt mới
  tiếp tục tăng trên cùng tổng này mà không gọi lại dịch vụ cũ.
