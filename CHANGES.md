# Báo cáo rà soát website

Ngày thực hiện: 30/9/2026

## 1. Chức năng tổng hợp tin đã gỡ

- Gỡ khối “Tổng hợp tin tức hàng ngày”, dải tin thời sự và bảng tin góc màn hình.
- Gỡ 12 bản tóm tắt bài ngoài ở các mục Chuyển đổi số, Đổi mới sáng tạo và Nghiên cứu khoa học.
- Gỡ 5 thẻ bài tham khảo ngoài khỏi Bộ kỹ năng.
- Thay bằng khu vực **Cổng thông tin và nguồn tham khảo** gồm đúng ba liên kết tĩnh:
  Bộ Công an, Cục A05 và Học viện CSND.
- Không hiển thị tiêu đề bài, ảnh đại diện, đoạn dẫn, ngày đăng hoặc tác giả từ nguồn ngoài.

## 2. API, RSS, crawler và job đã gỡ

- Xóa Pages Function `/api/quick-news`.
- Xóa script `scripts/build-ticker.js` và dữ liệu dự phòng đi kèm.
- Xóa toàn bộ bộ đọc/phân tích trang chuyên mục Học viện trong `scripts/build-events.js`.
- Loại bước tạo dữ liệu tin ngoài khỏi `scripts/build-public.js`.
- Thu hẹp CSP, bỏ quyền tải ảnh từ CDN Học viện và bỏ kết nối thời tiết ngoài.
- Build công khai chỉ sao chép bốn tệp dữ liệu nội bộ đã xác định, không sao chép tệp dữ liệu cũ còn sót.

## 3. Cụm từ và định danh đã chỉnh

- Dùng định danh “Website chuyên đề Cẩm nang An toàn số”.
- “Tin chuyên đề và hoạt động” đổi thành “Hoạt động của Khoa”.
- “Bản quyền và nguồn tin” đổi thành “Bản quyền và nguồn thông tin”.
- Chân trang cấu hình rõ cơ quan chủ quản, đơn vị quản lý, tên website, người phụ trách nội dung,
  quản trị kỹ thuật, địa chỉ, email và điện thoại công vụ.
- Câu định danh pháp lý cuối chân trang chỉ hiển thị khi `legalDisclaimerApproved` được bật sau phê duyệt.

## 4. Miền ngoài còn liên kết hoặc kết nối

- Không có miền phân tích, bộ đếm truy cập hoặc nguồn tin ngoài nào được tự động kết nối.
- Lượt truy cập và lượt xem bài được thống kê nội bộ bằng Cloudflare D1, không gửi
  dữ liệu sang dịch vụ phân tích bên thứ ba.
- Chỉ tải khi bài có video được biên tập viên khai báo: `youtube-nocookie.com`.
- Chỉ mở khi người dùng bấm: các cổng chính thống và liên kết tham khảo cuối bài.
- Không còn miền ngoài nào được máy chủ hoặc trình duyệt gọi để lấy nội dung biên tập rồi đăng lại.

## Quy trình biên tập

- Bài mới đi qua `DRAFT → REVIEW → APPROVED → PUBLISHED`.
- Thêm cổng cục bộ `/admin` với ba tài khoản `admin`, `nganpt`, `vuongnq`; mật khẩu
  tạm chỉ hiện ở lần khởi tạo đầu và bắt buộc đổi khi đăng nhập.
- `nganpt` được gắn tên Thượng tá Phạm Thị Ngân và có quyền thẩm định, duyệt và đăng;
  `vuongnq` có quyền soạn và gửi duyệt; `admin` có toàn quyền theo yêu cầu vận hành.
- Người tạo bài thông thường không thể tự phê duyệt hoặc tự xuất bản; admin là ngoại lệ.
- Bổ sung giao diện soạn thảo gần giống Word, ảnh chen giữa các khối, chú thích ảnh,
  ảnh tư liệu cuối bài và tên tác giả ở cuối trang.
- Chuyển `/admin` sang cổng trực tuyến dùng Cloudflare Pages Functions, D1 và KV;
  mật khẩu được băm, ảnh bản thảo không công khai trước khi duyệt.
- Bổ sung thống kê truy cập ẩn danh, cột bài xem nhiều và biểu mẫu gửi tin nhắn không
  thu thập email; admin có quyền đọc, đánh dấu đã đọc và xóa tin nhắn.
- Bản chưa xuất bản bị loại khỏi build công khai nhưng vẫn có thể xem trước tại máy.
- Metadata lưu người tạo, người biên tập/rà soát, người cập nhật, người phê duyệt,
  người xuất bản, các mốc thời gian, lịch sử phiên bản và tài liệu tham khảo.
