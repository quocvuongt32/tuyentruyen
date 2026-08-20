// Doc file Excel mau-nhap-hoat-dong.xlsx, tao hang loat content/events/*.json
// tu cac dong da dien, gan anh tuong ung tu thu muc Anh-nhap-hoat-dong/ theo
// quy uoc ten file "<Ma su kien>-<so anh>.<duoi>" (Ma su kien = Ngay dang
// YYYYMMDD + STT, xem HUONG-DAN-DAT-TEN-ANH.txt). Dung khi lam offline / muon
// xong het 1 lan tai may, khac voi duong di qua /admin (xem
// scripts/build-events.js) la nop file .xlsx qua web va anh tu tim khi build.
//
// Chi dung Node core + scripts/lib/xlsx-events.js - khong can npm install.
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseEventsWorkbook, slugify } = require("./lib/xlsx-events");

const root = path.join(__dirname, "..");
const templatePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "uploads", "mau-nhap-hoat-dong.xlsx");
const stagingDir = path.join(root, "Anh-nhap-hoat-dong");
const uploadsDir = path.join(root, "uploads");
const eventsDir = path.join(root, "content", "events");

const GUIDE_FILENAME = "HUONG-DAN-DAT-TEN-ANH.txt";
const GUIDE_TEXT = `HƯỚNG DẪN ĐẶT TÊN ẢNH — THƯ MỤC NÀY DÙNG ĐỂ THẢ ẢNH TRƯỚC KHI NHẬP HÀNG LOẠT
============================================================================

Thư mục này dùng chung với file "uploads/mau-nhap-hoat-dong.xlsx" (nhập qua
Nhap-hang-loat.bat) LẪN với nút "Nhập hàng loạt (Excel)" trong /admin (nhập
qua web — xem README.md). Mỗi dòng hoạt động trong file Excel có 1 số ở cột
đầu tiên (cột "STT") và 1 ngày ở cột "Ngày" — ghép 2 giá trị này lại thành
MÃ SỰ KIỆN của dòng đó, dùng để ghép đúng ảnh vào đúng hoạt động.

CÁCH TÍNH MÃ SỰ KIỆN
---------------------
    <Ngày viết liền, dạng YYYYMMDD>-<Số ở cột STT>

Ví dụ: dòng có Ngày = 2026-01-15 và STT = 3 → mã sự kiện là "20260115-3".

CÁCH ĐẶT TÊN ẢNH
----------------
    <Mã sự kiện>-<Số thứ tự ảnh>.<đuôi file>

Ví dụ trên có 2 ảnh minh chứng thì đặt tên 2 ảnh là:
    20260115-3-1.jpg
    20260115-3-2.jpg

- Ảnh có số thứ tự nhỏ nhất (ví dụ …-1.jpg) sẽ tự động là ẢNH ĐẠI DIỆN của
  hoạt động đó (ảnh bìa hiển thị đầu tiên).
- Dùng dấu gạch ngang "-" hay gạch dưới "_" đều được.
- Đuôi file chấp nhận: .jpg .jpeg .png .gif .webp
- Mỗi hoạt động có bao nhiêu ảnh cũng được (1, 2, 3, ...), không giới hạn.
- Hoạt động nào không có ảnh thì cứ để trống, không cần tạo file gì cho mã đó.

VÌ SAO PHẢI GHÉP CẢ NGÀY (không chỉ dùng STT)
----------------------------------------------
Mỗi lần điền một file Excel mới, cột STT lại đếm lại từ 1 — nếu chỉ dùng STT
làm mã, ảnh của đợt nhập trước và đợt nhập sau rất dễ bị trùng mã, gán nhầm
ảnh sang hoạt động khác. Ghép thêm Ngày (hầu như luôn khác nhau giữa các đợt
nhập thực tế) giúp mã không bị trùng giữa các lần nhập khác nhau.

HAI CÁCH NHẬP — CHỌN 1 TRONG 2
-------------------------------
A) Tại máy (đầy đủ, làm 1 lần xong luôn):
   1. Điền uploads/mau-nhap-hoat-dong.xlsx.
   2. Thả ảnh vào đúng thư mục này, đặt tên đúng quy ước ở trên.
   3. Bấm đúp "Nhap-hang-loat.bat" ở thư mục gốc dự án.
   4. Xem cảnh báo trên màn hình, sửa lại nếu cần rồi chạy lại.
   5. Ảnh trong thư mục này sẽ TỰ ĐỘNG BIẾN MẤT sau khi nhập thành công (đã
      chuyển hẳn vào uploads/) — bình thường, không phải lỗi.
   6. Nhờ Claude (hoặc tự làm) commit + push 1 lần lên GitHub.

B) Qua web, không cần ngồi máy tính này (/admin → "Nhập hàng loạt (Excel)"):
   1. Tải file .xlsx đã điền lên qua nút trong /admin.
   2. Tải ảnh minh chứng lên qua tab Media trong /admin, đặt tên đúng quy
      ước ở trên trước khi tải (KHÔNG đổi tên trong web, phải đổi tên sẵn
      trên máy trước).
   3. Trang sẽ tự đọc file Excel + tìm ảnh khớp mã mỗi khi build lại — nếu
      lúc đầu chưa có ảnh, hoạt động vẫn hiện (chưa có ảnh); tải ảnh lên sau
      thì lần build kế tiếp sẽ tự ghép vào, không cần làm gì thêm.
   4. Lưu ý: mỗi lần Lưu trong /admin (dù là Excel hay ảnh) đều tính là 1 lần
      deploy, tốn credit Netlify như nhau — nên gom nhiều ảnh vào tải 1 lần
      thay vì tải từng ảnh một.

LƯU Ý CHUNG
-----------
- Cột "Ngày" trong Excel phải viết đúng dạng YYYY-MM-DD (ví dụ 2026-01-15).
- Cột "Phân loại" phải đúng 1 trong 5 nhãn: An ninh mạng / Chuyển đổi số / Đổi
  mới sáng tạo / Nghiên cứu khoa học / Khác.
- Dòng nào chưa điền "Tiêu đề hoạt động" sẽ được bỏ qua (coi như dòng trống).
`;

function ensureGuideFile() {
  const guidePath = path.join(stagingDir, GUIDE_FILENAME);
  if (!fs.existsSync(guidePath)) {
    fs.writeFileSync(guidePath, GUIDE_TEXT, "utf8");
  }
}

function findImagesForCode(code) {
  if (!fs.existsSync(stagingDir)) return [];
  const re = new RegExp(`^${code}[-_](\\d+)\\.(jpg|jpeg|png|gif|webp)$`, "i");
  return fs
    .readdirSync(stagingDir)
    .map((name) => {
      const m = re.exec(name);
      return m ? { name, order: parseInt(m[1], 10) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

function main() {
  if (!fs.existsSync(templatePath)) {
    console.error(`Không tìm thấy file mẫu: ${templatePath}`);
    process.exit(1);
  }
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(eventsDir, { recursive: true });
  ensureGuideFile();

  console.log(`Đang đọc: ${path.relative(root, templatePath)}\n`);
  const buf = fs.readFileSync(templatePath);
  const { items, warnings } = parseEventsWorkbook(buf);

  let created = 0;

  for (const item of items) {
    const baseSlug = `${item.date}-${slugify(item.title)}`;
    let slug = baseSlug;
    let n = 2;
    while (fs.existsSync(path.join(eventsDir, `${slug}.json`))) {
      slug = `${baseSlug}-${n++}`;
    }

    const staged = findImagesForCode(item.code);
    const images = staged.map((f, i) => {
      fs.copyFileSync(path.join(stagingDir, f.name), path.join(uploadsDir, f.name));
      fs.unlinkSync(path.join(stagingDir, f.name));
      return { image: `/uploads/${f.name}`, featured: i === 0 };
    });
    if (!images.length) {
      warnings.push(`Mã ${item.code} ("${item.title}"): không tìm thấy ảnh nào trong Anh-nhap-hoat-dong/.`);
    }

    const data = {
      title: item.title,
      category: item.category,
      date: item.date,
      location: item.location,
      body: item.body,
      images,
      link: item.link,
      video: item.video,
    };
    if (item.planNumber) data.planNumber = item.planNumber;

    fs.writeFileSync(path.join(eventsDir, `${slug}.json`), JSON.stringify(data, null, 2), "utf8");
    console.log(`  + Đã tạo: content/events/${slug}.json (${images.length} ảnh)`);
    created++;
  }

  console.log(`\nXong: đã tạo ${created} hoạt động mới.`);
  if (warnings.length) {
    console.log(`\nCảnh báo (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }

  if (created > 0) {
    console.log("\nĐang cập nhật data/events.json...");
    execFileSync(process.execPath, [path.join(__dirname, "build-events.js")], {
      cwd: root,
      stdio: "inherit",
    });
    console.log(
      "\nXong! Kiểm tra lại bằng cách chạy thử ở local (Chay-thu.bat), rồi tự git add + commit + push khi ưng ý " +
        "(1 lần push cho tất cả, không push riêng từng hoạt động)."
    );
  }
}

main();
