# Kiến trúc dự án

## Mục tiêu

Dự án vận hành như website chuyên đề của Khoa Toán - Tin học và Ứng dụng KHCN
trong PCTP, Học viện Cảnh sát nhân dân. Phạm vi chính là cẩm nang an toàn số,
hoạt động tuyên truyền, tài liệu giáo dục, infographic và nội dung chuyên môn do
Khoa quản lý.

Website không tự động nạp nội dung biên tập từ website ngoài. Danh mục nguồn tham
khảo trong `content/site.json` chỉ gồm liên kết tĩnh tới Bộ Công an, Cục A05 và Học
viện CSND.

## Luồng build

`scripts/build-public.js` lần lượt dựng:

1. `scripts/build-events.js` → `data/events.json`.
2. `scripts/build-about.js` → `data/about.json`.
3. `scripts/build-site.js` → `data/site.json`.
4. `scripts/build-skills.js` → `data/skills.json`.
5. Sao chép đúng các tệp công khai và tài sản đang được tham chiếu vào `dist/`.
6. `scripts/build-pages.js` tạo trang riêng, trang chính sách và sitemap.

Không có bước nào gọi website bên ngoài để tạo nội dung công khai.

## Dữ liệu

- `content/events/`: hoạt động do Khoa quản lý.
- `content/ky-nang/`: cẩm nang, kỹ năng và infographic.
- `content/site.json`: nhận diện, menu, ba nguồn tham khảo tĩnh và chân trang.
- `content/gioi-thieu.json`: nội dung giới thiệu và căn cứ thực hiện.
- `uploads/`, `img/`: ảnh nội bộ.

Liên kết cuối bài có thể trỏ tới văn bản hoặc trang gốc để tham khảo; build không đọc
nội dung ở liên kết đó.

## Quy trình biên tập

`/admin` là cổng quản trị trực tuyến trên Cloudflare Pages Functions. Cổng dùng D1
cho tài khoản/bài viết, KV cho ảnh, phiên đăng nhập, CSRF token và phân quyền phía
máy chủ. Ba vai trò là `author`, `approver` và `admin`.

D1 đồng thời lưu thống kê truy cập ẩn danh, tổng lượt xem theo bài và tin nhắn góp ý.
Mã phiên do trình duyệt tạo và mã chống lạm dụng được băm một chiều trước khi lưu;
hệ thống không đưa họ tên, email hoặc địa chỉ IP rõ vào các bảng thống kê và góp ý.

Bài mới có đối tượng `workflow` gồm trạng thái, tên và tài khoản người tạo, người
phê duyệt, người xuất bản, các mốc thời gian, lịch sử phiên bản và danh sách tài liệu
tham khảo. Trạng thái hợp lệ:

```text
DRAFT → REVIEW → APPROVED → PUBLISHED
```

Build công khai chỉ nhận `PUBLISHED`. Nội dung kế thừa chưa có trường `workflow`
được coi là đã công khai trước khi quy trình mới được áp dụng; khi biên tập lại cần
bổ sung đầy đủ metadata.

Nội dung bài mới dùng các khối có cấu trúc (`bodyBlocks`) thay vì nhận HTML tùy ý.
Khối hỗ trợ đoạn, tiêu đề, trích dẫn, danh sách, đường phân cách và ảnh kèm chú thích.
Máy chủ chỉ giữ một tập thẻ nội tuyến tối thiểu và chỉ chấp nhận ảnh thuộc `uploads/`.

## Bề mặt công khai

- Trang chủ và trang riêng của bài.
- Cẩm nang/infographic và thư viện ảnh, video do Khoa nhập.
- Kiểm tra kiến thức nhanh.
- Liên kết tham khảo tới Bộ Công an, Cục A05 và Học viện CSND.
- Thống kê đang truy cập, hôm nay, tháng hiện tại và tổng lượt truy cập.
- Danh sách bài xem nhiều nhất và biểu mẫu tin nhắn không yêu cầu email.
- Trang giới thiệu, liên hệ, điều khoản, bảo vệ dữ liệu cá nhân, bản quyền và nguồn.

Không có đăng ký thành viên, đăng bài cộng đồng, bình luận hoặc diễn đàn. Tin nhắn
góp ý không tự hiển thị công khai. `/admin`
chỉ dành cho ba tài khoản được phân quyền; ảnh bản thảo không phục vụ cho người chưa
đăng nhập và nội dung chỉ chuyển sang công khai sau bước duyệt.

## Dịch vụ ngoài còn dùng

- `youtube-nocookie.com`: chỉ để nhúng video do biên tập viên chủ động khai báo
  trong bài.
- Các miền trong `officialSources` và liên kết tham khảo: chỉ mở khi người dùng bấm.

Website tự thống kê bằng D1 và không dùng dịch vụ phân tích hoặc bộ đếm truy cập bên thứ ba.
