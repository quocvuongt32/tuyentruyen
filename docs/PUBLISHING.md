# Quy trình biên tập và xuất bản

## Mở cổng biên tập

1. Truy cập `https://tuyentruyen.khoaktt.vn/admin` hoặc bấm đúp `Dang-bai.bat`.
2. Trình duyệt mở cổng quản trị trực tuyến qua HTTPS.
3. Đăng nhập bằng tài khoản được phân công.
4. Ở lần đăng nhập đầu, dùng mật khẩu tạm trong tệp quản trị cục bộ rồi đổi ngay khi hệ thống yêu cầu.

Dữ liệu tài khoản và bài đang xử lý được lưu trên Cloudflare D1; ảnh được lưu ở kho
KV riêng. Tệp mật khẩu tạm ban đầu chỉ lưu trong `.publisher/` tại máy quản trị,
không đưa lên Git và không xuất hiện trong `dist/`.

## Tài khoản và vai trò mặc định

| Tài khoản | Họ tên | Vai trò |
| --- | --- | --- |
| `admin` | Quản trị hệ thống | Toàn quyền từ soạn thảo tới duyệt, đăng và quản lý tài khoản |
| `nganpt` | Thượng tá Phạm Thị Ngân | Đọc bản chờ thẩm định, bấm **Duyệt và đăng bài** |
| `vuongnq` | Đại úy Nguyễn Quốc Vương | Soạn bài, lưu bản nháp và gửi thẩm định |

Admin có thể đổi họ tên, vai trò, trạng thái hoạt động, đặt mật khẩu tạm mới cho
tài khoản khác và xử lý góp ý trong mục **Hộp thư góp ý**. Hệ thống không cho tài khoản đang
đăng nhập tự khóa hoặc tự đổi vai trò tại màn hình này.

### Tạo thêm tài khoản

1. Mở **Quản lý tài khoản**, nhập tên đăng nhập chữ thường, họ tên, vai trò và mật khẩu tạm.
2. Chọn **Tạo tài khoản**. Tên đăng nhập phải duy nhất; mật khẩu phải đáp ứng quy tắc an toàn.
3. Chuyển riêng tên đăng nhập và mật khẩu tạm cho người được cấp. Ở lần đăng nhập đầu, hệ thống
   bắt buộc người dùng đặt mật khẩu mới trước khi dùng các chức năng khác.

## Chỉnh chữ trên Trang chủ

1. Admin chọn **Chỉnh chữ Trang chủ** trên thanh công cụ.
2. Chỉnh các trường theo nhóm: nhận diện/menu, banner mở đầu, giới thiệu, nguồn tham khảo,
   khu vực nội dung và liên hệ/thống kê.
3. Chọn **Lưu và cập nhật Trang chủ**. Website chỉ nhận văn bản thuần và tự cập nhật sau khi tải lại.
4. Chọn **Khôi phục mặc định** tại từng trường rồi lưu nếu muốn dùng lại nội dung trong mã nguồn.

## Quản lý banner Trang chủ

1. Đăng nhập bằng tài khoản `admin`, chọn **Banner trang chủ** trên thanh công cụ.
2. Chọn **Thêm ảnh banner** để tải JPG, PNG hoặc WebP. Ảnh được tự xoay, tối ưu thành
   JPEG và giới hạn cạnh dài 1.920 px trước khi gửi lên kho ảnh.
3. Bấm **Xóa** dưới ảnh không còn dùng. Ảnh biến mất khỏi vòng chạy sau khi Trang chủ
   được tải lại.
4. Nhập thời gian từ 2 đến 20 giây và chọn **Lưu tốc độ**. Giá trị mặc định là 4 giây/ảnh.

Mỗi lần tải tối đa 8 ảnh, toàn bộ banner tối đa 30 ảnh. Nếu xóa hết ảnh, Trang chủ vẫn
hiển thị huy hiệu của Cẩm nang và không phát sinh khung ảnh lỗi.

## Xử lý tin nhắn người đọc

- Biểu mẫu cuối trang chủ chỉ nhận nội dung, không yêu cầu họ tên hoặc email.
- Tin mới hiển thị huy hiệu số lượng ở nút **Hộp thư góp ý** trong `/admin`.
- Admin có thể đánh dấu đã đọc hoặc xóa vĩnh viễn; tin nhắn không tự xuất hiện trên
  website công khai.
- Không yêu cầu người đọc gửi bí mật nhà nước, dữ liệu nghiệp vụ hoặc dữ liệu cá nhân
  qua biểu mẫu này.

## Soạn bài như Word

- **Tiêu đề**: nhập bình thường; trang bài viết tự hiển thị chữ hoa và đậm.
- **Tóm tắt**: trang bài viết tự hiển thị đậm và in nghiêng.
- **Căn lề tiêu đề và tóm tắt**: chọn căn trái, giữa, phải hoặc đều hai bên ngay cạnh trường
  tương ứng. Cả hai trường mặc định căn đều hai bên và giữ nguyên lựa chọn khi xuất bản.
- **Nội dung**: có kiểu đoạn thường, tiêu đề mục, tiêu đề nhỏ, trích dẫn; hỗ trợ chữ
  đậm, nghiêng, gạch chân, danh sách, liên kết và căn lề.
- **Ảnh giữa bài**: đặt con trỏ tại vị trí cần chèn rồi chọn **Ảnh trong bài**. Chú
  thích sửa trực tiếp dưới ảnh; khi đăng sẽ hiển thị in nghiêng màu xanh lá.
- **Ảnh đại diện và ảnh tư liệu**: ảnh đầu là ảnh đại diện; các ảnh còn lại tạo thư
  viện tư liệu sau phần nội dung.
- **Tác giả**: tự lấy từ họ tên tài khoản đăng nhập và đặt ở góc dưới bên phải bài.

Ảnh được tự xoay, thu nhỏ, chuẩn hóa JPEG và điều chỉnh chất lượng theo dung lượng
mục tiêu. Tổng số ảnh đại diện, ảnh giữa bài và ảnh tư liệu tối đa là 30 ảnh/bài.

## Quản lý bài đã đăng

1. Đăng nhập bằng tài khoản `admin`, chọn **Quản lý bài đã đăng** trên thanh công cụ.
2. Danh sách hiển thị cả bài có sẵn của website và bài đã xuất bản qua `/admin`, chia theo
   Hoạt động/Tuyên truyền và Bộ kỹ năng An toàn số.
3. Chọn **Sửa** để nạp bài vào trình soạn thảo; nút lưu lúc này cập nhật ngay bài đang công khai
   nhưng vẫn giữ nguyên đường dẫn. Chọn **Hủy sửa bài đã đăng** để quay lại soạn bài mới.
4. Chọn **Xóa** để gỡ bài khỏi website. Với bài có sẵn, hệ thống lưu trạng thái ẩn để bài không
   xuất hiện trở lại sau lần build tiếp theo.
5. Giữ biểu tượng kéo và thả bài lên/xuống trong từng nhóm. Thứ tự mới được lưu tự động và được
   áp dụng ở các khu vực danh sách trên website.

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
