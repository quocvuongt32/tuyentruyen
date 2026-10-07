# Nhật ký thay đổi

## 7/10/2026 — Quản lý toàn bộ bài, chữ Trang chủ và tài khoản mới

- Admin xem được toàn bộ bài đã đăng, kể cả nội dung tĩnh kế thừa; có thể sửa trực tiếp, xóa
  khỏi website và kéo thả thứ tự hiển thị theo từng nhóm.
- Bổ sung trình chỉnh chữ Trang chủ theo nhóm, lưu văn bản thuần trong D1 và áp dụng sau khi tải
  dữ liệu tĩnh để không phải sửa mã nguồn.
- Bổ sung tạo tài khoản mới với ba vai trò hiện có; mật khẩu tạm luôn phải đổi ở lần đăng nhập đầu.
- Tiêu đề/tóm tắt bài mặc định căn đều hai bên và tiêu đề trang bài được thu nhỏ.

## 1/10/2026 — Khôi phục lượt truy cập và quản lý banner

- Khôi phục 4.155 lượt truy cập lịch sử từ bộ đếm GoatCounter cũ và giữ nguyên toàn
  bộ lượt D1 đã phát sinh, không ghi đè số mới.
- Bố trí **Bài được xem nhiều nhất** cạnh Dòng thời gian Tuyên truyền An ninh mạng
  theo tỷ lệ 70:30; giao diện di động xếp khối quan tâm lên trước dòng thời gian.
- Bổ sung mục **Banner trang chủ** cho admin: xem danh sách, thêm/xóa ảnh và đặt tốc độ
  chuyển ảnh từ 2 đến 20 giây.
- Khởi tạo 15 ảnh banner hiện có vào D1; ảnh mới được tối ưu rồi lưu trong KV.
- Rút gọn khu gửi tin nhắn, bỏ đoạn mô tả dài; tin gửi tiếp tục vào **Hộp thư góp ý**
  có huy hiệu tin chưa đọc trong `/admin`.
- Khôi phục thanh thời tiết Hà Nội và thời gian GMT+7 ngay dưới menu chính.
- Khôi phục khung **Thời sự**, nhưng chỉ chạy 7 bài mới nhất của chính website, gồm cả bài đã
  xuất bản qua `/admin`; không dùng lại cơ chế tổng hợp tin ngoài trước đây.
- Thời tiết được lấy qua API cùng miền `/api/weather`, lọc trường dữ liệu và lưu đệm tại Cloudflare.
- Bổ sung căn lề riêng cho tiêu đề và tóm tắt, mặc định căn đều hai bên.
- Bổ sung **Quản lý bài đã đăng** cho admin: hợp nhất bài có sẵn và bài trực tuyến, cho phép sửa,
  xóa và kéo thả thứ tự hiển thị mà vẫn giữ nguyên đường dẫn bài.

## 30/9/2026 — Thống kê truy cập, bài xem nhiều và tin nhắn góp ý

- Bổ sung bộ đếm đang truy cập, hôm nay, tháng hiện tại và tổng lượt truy cập bằng D1.
- Ghi lượt xem bài theo mã phiên ẩn danh, chống tính lặp trong ngày và hiển thị sáu bài
  xem nhiều nhất ở cột bên phải.
- Thêm biểu mẫu gửi tin nhắn không yêu cầu họ tên/email; admin có thể đọc, đánh dấu
  đã xử lý và xóa tại `/admin`.
- Đổi tên khu vực thành **Nguồn tham khảo / Cổng thông tin và nguồn tham khảo**, chỉ
  giữ liên kết tới Bộ Công an, Cục A05 và Học viện CSND.
- Cập nhật chính sách bảo vệ dữ liệu cá nhân cho thống kê ẩn danh và tin nhắn góp ý.

## 30/9/2026 — Cổng biên tập có tài khoản và trình soạn thảo trực quan

- Đưa cổng biên tập cục bộ về `/admin`, bổ sung đăng nhập, phiên bảo mật, CSRF token,
  giới hạn đăng nhập sai và quản lý tài khoản theo vai trò.
- Tạo ba tài khoản mặc định: `admin`, `nganpt` và `vuongnq`; không lưu mật khẩu rõ.
- Bổ sung trình soạn thảo gần giống Word với định dạng đoạn, danh sách, căn lề, liên
  kết, ảnh chen giữa bài, chú thích ảnh và ảnh tư liệu cuối bài.
- Chuẩn hóa trang bài: tiêu đề hoa đậm, tóm tắt đậm nghiêng, nội dung chữ thường,
  chú thích ảnh nghiêng màu xanh lá và tác giả ở góc dưới bên phải.
- `nganpt` có luồng đọc bản chờ thẩm định rồi bấm **Duyệt và đăng bài**; admin có toàn
  quyền từ soạn tới xuất bản và quản lý tài khoản.
- Thêm kiểm thử tài khoản, mật khẩu, phân quyền và bộ lọc nội dung giàu định dạng.
- Triển khai backend Cloudflare Pages Functions, D1 và KV để `/admin` đăng nhập và
  xuất bản trực tuyến; ảnh bản thảo được kiểm soát theo phiên và vai trò.

## 29/9/2026 — Chuẩn hóa thành website chuyên đề

- Loại bỏ toàn bộ cơ chế tự động lấy, phân tích và tái tạo nội dung biên tập từ website ngoài.
- Loại bỏ dải tin thời sự, khối tin hằng ngày và dữ liệu bài ngoài từng lưu trong kho nội dung.
- Thay bằng danh mục liên kết nguồn chính thống tĩnh ở cấp cơ quan.
- Chuẩn hóa tên website, đơn vị quản lý, chân trang và trang bản quyền/nguồn thông tin.
- Bổ sung quy trình `DRAFT → REVIEW → APPROVED → PUBLISHED`; người tạo bài không thể tự
  phê duyệt hoặc tự xuất bản.
- Build công khai loại nội dung chưa xuất bản và có kiểm tra ngăn cơ chế lấy tin ngoài quay lại.

## 24/9/2026 — Bảo vệ dữ liệu cá nhân và trang chính sách

- Gỡ biểu mẫu đăng ký bản tin, biểu mẫu góp ý công khai có trường email và các dịch vụ gửi dữ liệu liên quan.
- Trang Liên hệ chỉ công bố đầu mối công vụ; không tự động công khai nội dung phản hồi.
- Thêm trang Chính sách bảo vệ dữ liệu cá nhân, Điều khoản sử dụng, Bản quyền và nguồn thông tin, Liên hệ.
- Gia cố CSP, security headers và kiểm tra build để ngăn chức năng thu thập email quay trở lại.

## 21/9/2026 — Trình đăng bài cục bộ và tối ưu ảnh

- Thêm công cụ `Dang-bai.bat` chạy trên `127.0.0.1`, không xuất hiện trên website công khai.
- Ảnh được tự xoay, giới hạn kích thước, điều chỉnh chất lượng theo dung lượng mục tiêu và kiểm tra lại ở máy chủ cục bộ.
- Mỗi bài do Khoa quản lý có URL riêng, metadata chia sẻ và logo Cẩm nang An toàn số.
