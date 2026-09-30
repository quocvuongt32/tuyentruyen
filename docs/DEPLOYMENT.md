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
- Khu vực nguồn chính thống chỉ chứa tên cơ quan, mô tả và nút truy cập.
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

Trước lần triển khai đầu phải chạy migration trong `migrations/` và seed ba tài khoản.
Không đưa `.publisher/`, `.wrangler/`, mật khẩu tạm hoặc trạng thái cơ sở dữ liệu cục
bộ vào Git. Mỗi tài khoản phải đổi mật khẩu ở lần đăng nhập đầu.

## Khôi phục

- Nội dung nguồn nằm trong Git và có thể phục hồi theo từng commit.
- `npm run backup` tạo bản sao lưu nội dung tại máy.
- Không dùng thao tác ghi đè lịch sử Git để xử lý lỗi triển khai.
