# Các thay đổi chuẩn hóa website

Ngày thực hiện: 24/9/2026

## Tin tức và nội dung nguồn ngoài

- Khối trang chủ dùng nhãn “Tổng hợp tin tức hàng ngày” và hiển thị đúng 4 tin từ Cục A05 - Bộ Công an và Học viện CSND.
- Các chuyên mục Chuyển đổi số, Đổi mới sáng tạo, Nghiên cứu khoa học chỉ giữ 4–6 bản tóm tắt có tên nguồn và liên kết bài gốc.
- Tin nguồn ngoài không còn tạo hoặc dẫn tới trang bài riêng của website.
- Chân trang nêu rõ phạm vi phục vụ trong và ngoài Học viện, tư cách sản phẩm dự thi và trạng thái đang hoàn thiện thủ tục công nhận.

## Nhận diện chính thức

- Dùng thống nhất tên: “Trang thông tin điện tử Cẩm nang An toàn số - Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP, Học viện Cảnh sát nhân dân”.
- Trang bài riêng sử dụng `img/badge.png`, ghi “Của Khoa KTT, Học viện CSND”.
- Footer công bố đúng đơn vị quản lý, Thượng tá Phạm Thị Ngân phụ trách quản lý nội dung và Đại úy Nguyễn Quốc Vương quản trị kỹ thuật.
- `content/site.json` có hai trường `decisionNumber`, `decisionDate`. Khi chưa có số quyết định thật, nội dung này để trống và không hiển thị.

## Bảo vệ dữ liệu cá nhân

- Xóa form đăng ký bản tin, form góp ý có trường email, endpoint `/api/newsletter/subscribe` và toàn bộ mã gửi bản tin Resend cũ.
- Xóa khóa Web3Forms từng được nhúng công khai trong HTML.
- Trang Liên hệ chỉ công bố đầu mối; không còn biểu mẫu thu thập họ tên hoặc email.
- Thêm các trang Chính sách bảo vệ dữ liệu cá nhân, Điều khoản sử dụng, Bản quyền và nguồn tin, Liên hệ.

## An toàn hệ thống

- CSP không còn cho phép kết nối Web3Forms; bổ sung `base-uri`, `object-src`, `form-action` và `upgrade-insecure-requests`.
- Bổ sung `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-Permitted-Cross-Domain-Policies` và chặn lập chỉ mục khu vực quản trị/xem trước.
- Build check xác nhận không còn form/endpoint thu thập email và kiểm tra nhận diện trên trang bài riêng.

## Ảnh hưởng dữ liệu, route và biến môi trường

- Không migration và không xóa nội dung bài viết/media.
- Route mới: `/privacy/`, `/terms/`, `/nguon-tin/`, `/contact/`.
- Các biến `RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `NEWSLETTER_FROM` không còn được mã nguồn sử dụng và nên xóa khỏi cấu hình Cloudflare sau khi xác nhận không còn hệ thống khác dùng chung.

## Rollback

- Có thể hoàn tác bằng Git về commit trước thay đổi này.
- Nếu chỉ cần khôi phục giao diện nhận diện, hoàn tác `index.html`, `scripts/build-pages.js`, `css/article.css`, `css/forms.css` và `content/site.json`.
- Không khôi phục chức năng thu thập email nếu chưa có phê duyệt, thông báo quyền riêng tư, thời hạn lưu trữ, cơ chế xóa dữ liệu và biện pháp chống lạm dụng phù hợp.

## Hạng mục cần quyết định riêng

Repository hiện là website tĩnh, không có cơ sở dữ liệu hoặc hệ thống định danh người dùng. Workflow nhiều vai trò, trạng thái duyệt, audit log và metadata kiểm tra media theo tài liệu yêu cầu cần một thiết kế CMS có xác thực/ủy quyền riêng; không được giả lập bằng trường ẩn phía trình duyệt.
