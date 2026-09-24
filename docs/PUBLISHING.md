# Đăng bài và chia sẻ liên kết

## Cách đăng được khuyến nghị

Bấm đúp **`Dang-bai.bat`** tại thư mục gốc của ứng dụng. Cửa sổ lệnh phải được giữ mở
trong lúc sử dụng; giao diện đăng bài sẽ tự mở trong trình duyệt tại địa chỉ cục bộ
`127.0.0.1`. Giao diện này không được xuất bản lên Internet.

Quy trình:

1. Chọn **Chương trình tuyên truyền** hoặc **Bài viết / chuỗi kỹ năng**.
2. Nhập tiêu đề, ngày, chủ đề, tóm tắt và nội dung chi tiết. Với **Chương trình
   tuyên truyền**, vị trí mặc định là **Dòng thời gian Tuyên truyền**; công cụ tự khóa
   chủ đề `An ninh mạng` để bài xuất hiện ngay ở đúng dòng thời gian sau khi deploy.
   Chỉ chọn **Khu vực Hoạt động khác** khi đây không phải bài tuyên truyền an ninh mạng.
3. Kéo/thả hoặc chọn ảnh. Ảnh đầu tiên là ảnh đại diện; dùng các nút mũi tên/Bìa để
   đổi thứ tự hoặc chọn lại ảnh đại diện.
4. Bấm **Lưu & kiểm tra toàn bộ**. Bước này chỉ lưu tại máy, tự chạy build/check và chưa
   đưa nội dung lên Internet.
5. Bấm **Xem trước đầy đủ** để kiểm tra trang bài riêng.
6. Bấm **Đăng lên website**. Công cụ chỉ stage các file JSON/ảnh của bài, tạo một commit
   riêng, push lên `origin/main`, chờ Cloudflare Pages và trả về liên kết để sao chép.

URL sau khi đăng:

```text
https://tuyentruyen.khoaktt.vn/hoat-dong/<slug>/
https://tuyentruyen.khoaktt.vn/ky-nang/<slug>/
```

## Xử lý ảnh

Giao diện nhận JPG, PNG và WebP tới 250 MB/ảnh, tối đa 15 ảnh/bài. Mỗi ảnh trải qua hai lớp kiểm tra:

1. Trình duyệt đọc ảnh, áp dụng chiều xoay, thu nhỏ cạnh dài tối đa 1.920 px, chuyển sang
   JPEG nền trắng và tìm chất lượng cao nhất trong ngưỡng mục tiêu khoảng 1,4 MB. Kích
   thước chỉ giảm thêm khi nén chất lượng vẫn chưa đủ.
2. Máy chủ cục bộ kiểm tra lại chữ ký JPEG, kích thước tối thiểu 320 × 320 px, kích thước
   tối đa 2.200 px và dung lượng tối đa 2,5 MB trước khi ghi file.

Thẻ ảnh hiển thị dung lượng trước và sau tối ưu để người đăng kiểm tra ngay.

Tên ảnh được tạo mới theo ngày + slug + số thứ tự và lưu trong `uploads/`. Build public
chỉ sao chép các ảnh thực sự được nội dung tham chiếu. `npm run check` xác nhận từng ảnh
tham chiếu tồn tại trong `dist/`; nếu thiếu/hỏng, bài không được chuyển sang trạng thái
sẵn sàng đăng. Cách này tránh link ảnh tạm thời hoặc phụ thuộc dịch vụ lưu ảnh bên ngoài.

Không hỗ trợ trực tiếp HEIC vì khả năng đọc khác nhau giữa các trình duyệt. Hãy xuất ảnh
HEIC thành JPG trước khi chọn.

## Trang bài riêng và chia sẻ

`scripts/build-pages.js` tạo HTML tĩnh cho từng hoạt động và kỹ năng nội bộ. Mỗi trang có:

- URL riêng ổn định;
- tiêu đề, tóm tắt, nội dung, ảnh đại diện và thư viện ảnh;
- canonical URL và Open Graph/Twitter Card để hiện tiêu đề/ảnh khi chia sẻ;
- nút **Sao chép liên kết** và **Chia sẻ bài**;
- bài trước/bài sau nếu thuộc cùng một chuỗi kỹ năng;
- mục tương ứng trong `sitemap.xml`.

Slug được cố định khi tạo bài. Việc sửa tiêu đề về sau không nên đổi tên file/slug nếu
liên kết đã được quảng bá.

## Các chốt an toàn khi đăng

- Chỉ chạy tại `127.0.0.1` và dùng token phiên ngẫu nhiên cho mọi thao tác ghi.
- Không lưu GitHub token trong giao diện/trình duyệt.
- Không cho đăng nếu build/check thất bại, Git đang có file staged từ trước, đang ở nhánh
  khác `main`, hoặc có commit cũ chưa push.
- Chỉ stage file nội dung và ảnh vừa tạo; các thay đổi khác trong thư mục không bị đưa
  vào commit bài đăng.
- Nếu push lỗi, commit được giữ lại để có thể bấm đăng lại sau khi mạng ổn định.
- Có thể hủy bài đang chờ đăng; công cụ xóa nội dung/ảnh vừa tạo và dựng lại website.

## Bài viết và chuỗi kỹ năng

Khi chọn **Bài viết / chuỗi kỹ năng**, có thể nhập:

- tên chuỗi, ví dụ `Kỹ năng chuyển đổi số cho công dân`;
- thứ tự bài: 1, 2, 3...

Các bài có cùng tên chuỗi sẽ tự hiện liên kết bài trước/bài sau theo thứ tự. Nếu là bài
độc lập, để trống hai trường này.

## Bài mới xuất hiện ở đâu

- **Chương trình tuyên truyền + Dòng thời gian Tuyên truyền** → đầu mục
  `Tuyên truyền An ninh mạng`, sắp theo ngày mới nhất.
- **Chương trình tuyên truyền + Khu vực Hoạt động khác** → lưới hoạt động và bộ lọc
  theo chủ đề đã chọn.
- **Bài viết / chuỗi kỹ năng** → mục `Bộ kỹ năng An toàn số`, đồng thời có URL riêng
  `/ky-nang/<slug>/` để gửi Zalo, email hoặc mạng xã hội.

Mọi vị trí đều được sinh lại trong cùng lần build. Vì vậy bài không phải chờ nhập lần
hai hay sửa tay trên trang chủ.

## Cú pháp nội dung

Ô nội dung hỗ trợ Markdown cơ bản:

```text
## Tiêu đề phụ

Đoạn văn có **chữ đậm** và *chữ nghiêng*.

- Mục thứ nhất
- Mục thứ hai

[Tên liên kết](https://example.com)
```

HTML người dùng nhập được escape; chỉ các thành phần Markdown trong danh sách cho phép
được chuyển thành HTML.

## Cách cũ và nhập hàng loạt

- `Them-su-kien.bat`: thêm một hoạt động bằng giao diện dòng lệnh; vẫn được giữ để dự phòng.
- `Nhap-hang-loat.bat`: dùng file Excel mẫu khi cần nhập nhiều hoạt động cùng lúc.
- Có thể sửa JSON trong `content/events/` hoặc `content/ky-nang/`, sau đó chạy
  `npm run build` và `npm run check`.

## Chi phí

Quy trình sử dụng GitHub và Cloudflare Pages hiện tại, không cần database, CMS hoặc dịch
vụ lưu ảnh ngoài nên không phát sinh phí định kỳ. Nội dung tiếp tục được bảo vệ bằng lịch
sử Git và workflow sao lưu hằng tuần.
