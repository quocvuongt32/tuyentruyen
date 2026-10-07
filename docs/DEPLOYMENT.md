# Triển khai và vận hành

## Build chuẩn

```powershell
npm run build
npm run check
```

Thư mục xuất bản là `dist/`. Không xuất bản trực tiếp thư mục gốc của dự án.

Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 24

## Kiểm tra trước triển khai

- `npm run check` phải thành công.
- Không có bản `DRAFT`, `REVIEW` hoặc `APPROVED` trong `dist/data/`.
- Không có công cụ nội bộ, cấu hình Git, tài liệu nguồn hoặc tệp Office trong `dist/`.
- Không có `.publisher/`, dữ liệu tài khoản, bản băm mật khẩu hoặc phiên đăng nhập trong `dist/`.
- Khu vực nguồn tham khảo có đúng ba thẻ: Bộ Công an, A05 và Học viện CSND.
- Trang chủ có bộ đếm truy cập, danh sách bài xem nhiều và biểu mẫu gửi tin nhắn;
  `/admin` có khu vực xử lý tin nhắn và quản lý banner cho tài khoản quản trị.
- `/admin` có điều khiển căn tiêu đề/tóm tắt và khu quản lý bài đã đăng để sửa, xóa,
  kéo thả thứ tự; tiêu đề và tóm tắt mặc định căn đều hai bên.
- Thanh đầu trang phải hiển thị thời tiết, thời gian và 5–7 bài mới nhất của chính website;
  `/api/weather` phải trả dữ liệu đã lọc và được lưu đệm.
- Chân trang hiển thị đúng cơ quan chủ quản, đơn vị quản lý và người chịu trách nhiệm.
- Trường email/điện thoại để trống sẽ tự ẩn; chỉ điền thông tin công vụ đã xác nhận.
- Câu định danh pháp lý cuối chân trang chỉ hiện khi đặt
  `footer.legalDisclaimerApproved` thành `true` sau khi được duyệt.

## Headers bảo mật

`_headers` là cấu hình dùng cho Cloudflare Pages. Chính sách hiện chỉ cho phép:

- tài nguyên cùng miền;
- khung video YouTube ở chế độ tăng cường quyền riêng tư do biên tập viên chủ động
  thêm.

Website không cho phép kết nối tới dịch vụ phân tích hoặc bộ đếm truy cập bên thứ ba.

Không mở quyền camera, microphone hoặc định vị; không cho website khác nhúng trang.

## Đường dẫn `/admin`

`/admin` được phục vụ qua Cloudflare Pages Functions và HTTPS. Các binding bắt buộc:

- `DB`: D1 database `tuyentruyen-admin`.
- `MEDIA`: KV namespace `TUYENTRUYEN_MEDIA`.

Trước lần triển khai đầu phải chạy toàn bộ migration trong `migrations/` và seed ba tài khoản.
Migration `0002_engagement.sql` tạo bảng thống kê truy cập, lượt xem bài, phiên đang
hoạt động và tin nhắn góp ý. Phải áp dụng migration này trước khi triển khai mã mới.
Migration `0003_banner_and_legacy_traffic.sql` cộng một lần 4.155 lượt lịch sử vào
tổng D1, tạo cấu hình tốc độ banner và khởi tạo danh sách 15 ảnh banner hiện có.
Phải áp dụng migration này trước khi triển khai API quản lý banner.
Migration `0004_published_content_management.sql` thêm căn lề tiêu đề/tóm tắt và bảng lưu
thứ tự/trạng thái ẩn của bài đã đăng, đồng thời tạo bảng văn bản Trang chủ do admin quản lý.
Phải áp dụng migration này trước khi triển khai mã quản lý bài đã đăng và chỉnh chữ Trang chủ.
Không đưa `.publisher/`, `.wrangler/`, mật khẩu tạm hoặc trạng thái cơ sở dữ liệu cục
bộ vào Git. Mỗi tài khoản phải đổi mật khẩu ở lần đăng nhập đầu.

## Khôi phục

- Nội dung nguồn nằm trong Git và có thể phục hồi theo từng commit.
- Thống kê, tin nhắn và bài đăng trực tuyến nằm trong D1; cần dùng chức năng sao lưu
  D1 của Cloudflare khi xây dựng lịch sao lưu vận hành.
- `npm run backup` tạo bản sao lưu nội dung tại máy.
- Không dùng thao tác ghi đè lịch sử Git để xử lý lỗi triển khai.
