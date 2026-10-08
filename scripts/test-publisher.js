"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createAuthStore } = require("./lib/publisher-auth");
const { normalizeBlocks, plainTextFromBlocks, renderBlocks } = require("./lib/rich-content");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cam-nang-publisher-test-"));
try {
  const auth = createAuthStore(tempRoot, path.join(tempRoot, "state"));
  const credentials = auth.initialize();
  assert.strictEqual(credentials.length, 3);
  for (const expected of ["admin", "nganpt", "vuongnq"]) {
    const credential = credentials.find((item) => item.username === expected);
    assert(credential, `Thiếu tài khoản ${expected}`);
    const user = auth.verify(expected, credential.password);
    assert(user && user.mustChangePassword, `Không đăng nhập được ${expected}`);
    assert.strictEqual(auth.verify(expected, `${credential.password}x`), null);
  }

  const adminPassword = credentials.find((item) => item.username === "admin").password;
  const changedAdmin = auth.changePassword("admin", adminPassword, "MatKhauMoi2026A");
  assert.strictEqual(changedAdmin.mustChangePassword, false);
  assert(auth.verify("admin", "MatKhauMoi2026A"));
  assert.strictEqual(auth.listUsers().find((user) => user.username === "nganpt").role, "approver");
  assert.strictEqual(auth.listUsers().find((user) => user.username === "vuongnq").role, "author");
  assert.throws(() => auth.updateUser("admin", { fullName: "Quản trị hệ thống", role: "author", active: true }), /ít nhất một tài khoản quản trị/);
  auth.updateUser("vuongnq", { fullName: "Đại úy Nguyễn Quốc Vương", role: "author", active: true });
  auth.resetPassword("vuongnq", "TamThoiMoi2026A");
  assert.strictEqual(auth.verify("vuongnq", "TamThoiMoi2026A").mustChangePassword, true);

  const blocks = normalizeBlocks([
    { type: "heading2", html: "Mục <strong>an toàn</strong><script>alert(1)</script>" },
    { type: "paragraph", html: "Xem <a href=\"javascript:alert(1)\">liên kết xấu</a> và <em>nội dung</em>." },
    { type: "image", imageId: "img-a", caption: "Chú thích ảnh minh họa" },
  ], (id) => id === "img-a" ? "/uploads/test.jpg" : "");
  const html = renderBlocks(blocks);
  assert(html.includes("<strong>an toàn</strong>"));
  assert(html.includes("/uploads/test.jpg"));
  assert(html.includes("<figcaption>Chú thích ảnh minh họa</figcaption>"));
  assert(!html.includes("<script"));
  assert(!html.includes("javascript:"));
  assert(plainTextFromBlocks(blocks).includes("nội dung"));
  assert.throws(() => normalizeBlocks([{ type: "paragraph", html: "a".repeat(12_001) }]), /dài quá giới hạn/);

  console.log("Kiểm thử cổng biên tập thành công: tài khoản, mật khẩu, phân quyền dữ liệu và nội dung giàu định dạng hợp lệ.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
