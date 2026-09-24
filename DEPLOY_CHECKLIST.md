# Checklist triển khai

## Trước khi triển khai

- [ ] Xác nhận footer đúng tên đơn vị và đúng hai đầu mối được phân công.
- [ ] Giữ trống `decisionNumber` và `decisionDate` nếu chưa có quyết định thật.
- [ ] Chạy `npm.cmd run build` và `npm.cmd run check` thành công.
- [ ] Kiểm tra `/`, một trang `/hoat-dong/.../`, một trang `/ky-nang/.../` và bốn trang chính sách.
- [ ] Xác nhận không còn ô nhập email, form bản tin, hòm thư góp ý hoặc request tới Web3Forms/Resend.
- [ ] Kiểm tra logo Cẩm nang không méo trên desktop và điện thoại.
- [ ] Kiểm tra `_headers`: CSP, HSTS, chống nhúng iframe, `nosniff`, chính sách referrer và các header cô lập nguồn.
- [ ] Rà `git diff` để bảo đảm không có mật khẩu, token, khóa API hoặc dữ liệu cá nhân.
- [ ] Sao lưu `content/`, `uploads/`, `img/` và ghi nhận commit dùng để rollback.

## Cấu hình Cloudflare

- [ ] Xóa các biến Resend chỉ sau khi xác nhận không có ứng dụng khác dùng chung.
- [ ] Bắt buộc HTTPS và kiểm tra chứng thư cho `tuyentruyen.khoaktt.vn`.
- [ ] Không cho lập chỉ mục `/admin/*`, `/preview/*` hoặc nội dung chưa công bố.
- [ ] Không bật lại endpoint/form thu thập email nếu chưa có phê duyệt và đánh giá bảo vệ dữ liệu cá nhân.

## Sau khi triển khai

- [ ] Mở DevTools, xác nhận không có lỗi CSP hoặc tài nguyên bị chặn ngoài dự kiến.
- [ ] Kiểm tra canonical, Open Graph, sitemap và favicon.
- [ ] Kiểm tra toàn bộ liên kết footer.
- [ ] Kiểm tra trang chi tiết hiển thị logo `badge.png`, dòng “Của Khoa KTT, Học viện CSND” và tên Khoa đầy đủ.
- [ ] Nếu phát sinh lỗi nghiêm trọng, rollback về commit đã ghi nhận; không sửa nóng trực tiếp trên `dist/`.
