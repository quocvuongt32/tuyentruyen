# Quy trình biên tập và xuất bản

## Mở cổng biên tập

1. Truy cập `https://tuyentruyen.khoaktt.vn/admin` hoặc bấm đúp `Dang-bai.bat`.
2. Trình duyệt mở cổng quản trị trực tuyến qua HTTPS.
3. Đăng nhập bằng tài khoản được phân công.
4. Ở lần chạy đầu, dùng mật khẩu tạm in trong cửa sổ BAT rồi đổi ngay khi hệ thống yêu cầu.

Dữ liệu tài khoản và bài đang xử lý được lưu trên Cloudflare D1; ảnh được lưu ở kho
KV riêng. Tệp mật khẩu tạm ban đầu chỉ lưu trong `.publisher/` tại máy quản trị,
không đưa lên Git và không xuất hiện trong `dist/`.

## Tài khoản và vai trò mặc định

| Tài khoản | Họ tên | Vai trò |
| --- | --- | --- |
| `admin` | Quản trị hệ thống | Toàn quyền từ soạn thảo tới duyệt, đăng và quản lý tài khoản |
| `nganpt` | Thượng tá Phạm Thị Ngân | Đọc bản chờ thẩm định, bấm **Duyệt và đăng bài** |
| `vuongnq` | Đại úy Nguyễn Quốc Vương | Soạn bài, lưu bản nháp và gửi thẩm định |

Admin có thể đổi họ tên, vai trò, trạng thái hoạt động và đặt mật khẩu tạm mới cho
tài khoản khác trong mục **Quản lý tài khoản**. Hệ thống không cho tài khoản đang
đăng nhập tự khóa hoặc tự đổi vai trò tại màn hình này.

## Soạn bài như Word

- **Tiêu đề**: nhập bình thường; trang bài viết tự hiển thị chữ hoa và đậm.
- **Tóm tắt**: trang bài viết tự hiển thị đậm và in nghiêng.
- **Nội dung**: có kiểu đoạn thường, tiêu đề mục, tiêu đề nhỏ, trích dẫn; hỗ trợ chữ
  đậm, nghiêng, gạch chân, danh sách, liên kết và căn lề.
- **Ảnh giữa bài**: đặt con trỏ tại vị trí cần chèn rồi chọn **Ảnh trong bài**. Chú
  thích sửa trực tiếp dưới ảnh; khi đăng sẽ hiển thị in nghiêng màu xanh lá.
- **Ảnh đại diện và ảnh tư liệu**: ảnh đầu là ảnh đại diện; các ảnh còn lại tạo thư
  viện tư liệu sau phần nội dung.
- **Tác giả**: tự lấy từ họ tên tài khoản đăng nhập và đặt ở góc dưới bên phải bài.

Ảnh được tự xoay, thu nhỏ, chuẩn hóa JPEG và điều chỉnh chất lượng theo dung lượng
mục tiêu. Tổng số ảnh đại diện, ảnh giữa bài và ảnh tư liệu tối đa là 30 ảnh/bài.

## Luồng duyệt và đăng

```text
DRAFT → REVIEW → APPROVED → PUBLISHED
```

1. `vuongnq` hoặc admin soạn bài, bấm **Lưu & kiểm tra toàn bộ**.
2. Người soạn mở bản xem trước để kiểm tra cách trình bày, sau đó bấm **Gửi thẩm định**.
3. `nganpt` đăng nhập, đọc toàn bộ bản xem trước và bấm **Duyệt và đăng bài**.
4. Hệ thống ghi người duyệt và xuất bản ngay nội dung từ cơ sở dữ liệu; trang bài có
   đường dẫn riêng và xuất hiện trong dữ liệu công khai của trang chủ.

Tài khoản soạn bài thông thường không được tự duyệt bài mình tạo. Admin là ngoại lệ
toàn quyền theo yêu cầu vận hành; mọi bước vẫn được ghi trong
`workflow.revisionHistory`.

Phiên bản hiện tại xử lý một bản đang chờ tại một thời điểm để tránh hai người duyệt
nhầm hai phiên bản khác nhau. Các tài khoản có thể đăng nhập từ máy khác nhau qua HTTPS.

## Rà soát trước khi duyệt

- Kiểm tra thẩm quyền công bố, bí mật nhà nước, bí mật nghiệp vụ, dữ liệu cá nhân và
  thông tin nội bộ.
- Chỉ dùng nội dung do Khoa biên soạn, quản lý hoặc được giao thực hiện.
- Nếu dẫn nguồn ngoài, tự viết phần phân tích phù hợp nhiệm vụ và để liên kết tham khảo.
- Không sao chép toàn văn, ảnh hoặc cấu trúc bài của nguồn ngoài khi chưa xác định
  quyền sử dụng.
- Kiểm tra quyền sử dụng của toàn bộ ảnh, video và tệp tư liệu.

## Nội dung kế thừa

Bài cũ chưa có metadata quy trình vẫn được giữ để tránh làm mất nội dung đang công
khai. Khi sửa bài cũ, cần bổ sung metadata và đưa bài qua quy trình mới trước khi đăng lại.
