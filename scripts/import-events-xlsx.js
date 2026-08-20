// Doc file Excel mau-nhap-hoat-dong.xlsx, tao hang loat content/events/*.json
// tu cac dong da dien, gan anh tuong ung tu thu muc Anh-nhap-hoat-dong/ theo
// quy uoc ten file "<STT>-<so anh>.<duoi>". Muc dich: cho phep them nhieu
// hoat dong cung luc bang 1 lan git push, thay vi tung bai qua /admin (moi
// lan luu qua /admin ton 15 credit Netlify, y het 1 lan push).
//
// Chi dung Node core (fs, path, zlib) - khong can npm install. .xlsx la 1
// file ZIP chua XML ben trong, nen phan doc ZIP/XML duoi day la tu viet,
// khong dung thu vien ngoai.
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const templatePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "uploads", "mau-nhap-hoat-dong.xlsx");
const stagingDir = path.join(root, "Anh-nhap-hoat-dong");
const uploadsDir = path.join(root, "uploads");
const eventsDir = path.join(root, "content", "events");

const CATEGORIES = [
  { label: "an ninh mang", value: "an-ninh-mang" },
  { label: "chuyen doi so", value: "chuyen-doi-so" },
  { label: "doi moi sang tao", value: "doi-moi-sang-tao" },
  { label: "nghien cuu khoa hoc", value: "nghien-cuu-khoa-hoc" },
  { label: "khac", value: "khac" },
];

function slugify(str) {
  let s = String(str).normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/đ/g, "d").replace(/Đ/g, "D");
  s = s.toLowerCase().trim();
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "su-kien";
}

function categoryFromLabel(label) {
  const norm = slugify(label).replace(/-/g, " ");
  const found = CATEGORIES.find((c) => c.label === norm);
  return found ? found.value : null;
}

// ---------------------------------------------------------------------
// Doc ZIP toi thieu (chi can du de doc .xlsx: End Of Central Directory +
// Central Directory + Local File Header, ho tro nen "stored" va "deflate").
// ---------------------------------------------------------------------
function readZip(buf) {
  const EOCD_SIG = 0x06054b50;
  let eocdOffset = -1;
  const searchStart = Math.max(0, buf.length - 22 - 65536);
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Không đọc được file .xlsx (không tìm thấy cấu trúc ZIP hợp lệ)");
  }

  const entryCount = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const CD_SIG = 0x02014b50;

  const entries = {};
  let offset = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(offset) !== CD_SIG) {
      throw new Error("File .xlsx bị hỏng (sai cấu trúc central directory)");
    }
    const compMethod = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
    entries[name] = { compMethod, compSize, localHeaderOffset };
    offset += 46 + nameLen + extraLen + commentLen;
  }

  function readEntry(name) {
    const e = entries[name];
    if (!e) return null;
    const lh = e.localHeaderOffset;
    const nameLen = buf.readUInt16LE(lh + 26);
    const extraLen = buf.readUInt16LE(lh + 28);
    const dataStart = lh + 30 + nameLen + extraLen;
    const raw = buf.subarray(dataStart, dataStart + e.compSize);
    if (e.compMethod === 0) return Buffer.from(raw);
    if (e.compMethod === 8) return zlib.inflateRawSync(raw);
    throw new Error(`File .xlsx dùng kiểu nén không hỗ trợ (${e.compMethod})`);
  }

  return { names: Object.keys(entries), readEntry };
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRegex.exec(xml))) {
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let text = "";
    let tm;
    while ((tm = tRegex.exec(m[1]))) text += decodeXmlEntities(tm[1]);
    strings.push(text);
  }
  return strings;
}

function colToIndex(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Excel luu ngay dang so serial (so ngay ke tu 1899-12-30) khi cell duoc
// dinh dang kieu Date. Cot "Ngay" trong mau nay la kieu chu (Text) nen binh
// thuong se khong gap truong hop nay, nhung van xu ly du phong neu nguoi
// dung go ngay va Excel tu doi sang kieu Date.
function excelSerialToIsoDate(serial) {
  const ms = Math.round((Number(serial) - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function parseSheetRows(xml, sharedStrings) {
  const rows = {};
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRegex.exec(xml))) {
    const rowNumMatch = /r="(\d+)"/.exec(rm[1]);
    if (!rowNumMatch) continue;
    const rowNum = parseInt(rowNumMatch[1], 10);
    const rowXml = rm[2];

    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    const rowData = {};
    while ((cm = cellRegex.exec(rowXml))) {
      const cellAttrs = cm[1];
      const cellInner = cm[2] || "";
      const refMatch = /r="([A-Z]+)\d+"/.exec(cellAttrs);
      if (!refMatch) continue;
      const col = colToIndex(refMatch[1]);
      const typeMatch = /\st="([a-zA-Z]+)"/.exec(cellAttrs);
      const type = typeMatch ? typeMatch[1] : null;

      let value = null;
      if (type === "inlineStr") {
        const tMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cellInner);
        value = tMatch ? decodeXmlEntities(tMatch[1]) : "";
      } else {
        const vMatch = /<v>([\s\S]*?)<\/v>/.exec(cellInner);
        const raw = vMatch ? vMatch[1] : null;
        if (raw === null) {
          value = null;
        } else if (type === "s") {
          const idx = parseInt(raw, 10);
          value = sharedStrings[idx] !== undefined ? sharedStrings[idx] : "";
        } else if (type === "str" || type === "b") {
          value = decodeXmlEntities(raw);
        } else {
          value = { __numeric: raw };
        }
      }
      rowData[col] = value;
    }
    rows[rowNum] = rowData;
  }
  return rows;
}

function cellText(rowData, col) {
  const v = rowData[col];
  if (v === undefined || v === null) return "";
  if (typeof v === "object" && v.__numeric !== undefined) return String(v.__numeric);
  return String(v).trim();
}

// ---------------------------------------------------------------------
// Doc file .xlsx
// ---------------------------------------------------------------------
function loadTemplate(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = readZip(buf);
  const sharedStrings = parseSharedStrings(zip.readEntry("xl/sharedStrings.xml")?.toString("utf8"));

  let sheetName = "xl/worksheets/sheet1.xml";
  if (!zip.names.includes(sheetName)) {
    sheetName = zip.names.find((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  }
  if (!sheetName) throw new Error("Không tìm thấy sheet nào trong file .xlsx");

  const sheetXml = zip.readEntry(sheetName).toString("utf8");
  return parseSheetRows(sheetXml, sharedStrings);
}

// Cot theo dung thu tu mau (khong doi ten header, khong chen/xoa cot).
const COL = {
  stt: 0,
  title: 1,
  category: 2,
  date: 3,
  location: 4,
  body: 5,
  link: 6,
  video: 7,
};

function isSafeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

// ---------------------------------------------------------------------
// Anh: quet Anh-nhap-hoat-dong/ tim file dat ten "<STT>-<so>.<duoi>".
// ---------------------------------------------------------------------
function findImagesForStt(stt) {
  if (!fs.existsSync(stagingDir)) return [];
  const re = new RegExp(`^${stt}[-_](\\d+)\\.(jpg|jpeg|png|gif|webp)$`, "i");
  return fs
    .readdirSync(stagingDir)
    .map((name) => {
      const m = re.exec(name);
      return m ? { name, order: parseInt(m[1], 10), ext: "." + m[2].toLowerCase() } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

// Tu tao lai file huong dan trong Anh-nhap-hoat-dong/ neu bi xoa mat hoac may
// khac clone repo lan dau (thu muc nay nam trong .gitignore nen khong co san).
const GUIDE_FILENAME = "HUONG-DAN-DAT-TEN-ANH.txt";
const GUIDE_TEXT = `HƯỚNG DẪN ĐẶT TÊN ẢNH — THƯ MỤC NÀY DÙNG ĐỂ THẢ ẢNH TRƯỚC KHI NHẬP HÀNG LOẠT
============================================================================

Thư mục này dùng chung với file "uploads/mau-nhap-hoat-dong.xlsx". Mỗi dòng hoạt
động trong file Excel có 1 số ở cột đầu tiên (cột "STT") — đây là MÃ SỰ KIỆN của
dòng đó, dùng để ghép đúng ảnh vào đúng hoạt động.

CÁCH ĐẶT TÊN ẢNH
----------------
    <Mã sự kiện>-<Số thứ tự ảnh>.<đuôi file>

Ví dụ: dòng có STT = 3 và có 2 ảnh minh chứng thì đặt tên 2 ảnh là:
    3-1.jpg
    3-2.jpg

- Ảnh có số thứ tự nhỏ nhất (ví dụ 3-1.jpg) sẽ tự động là ẢNH ĐẠI DIỆN của hoạt
  động đó (ảnh bìa hiển thị đầu tiên).
- Dùng dấu gạch ngang "-" hay gạch dưới "_" đều được: "3-1.jpg" và "3_1.jpg" như nhau.
- Đuôi file chấp nhận: .jpg .jpeg .png .gif .webp
- KHÔNG cần đặt tên có dấu tiếng Việt hay mô tả gì thêm — chỉ cần đúng số ở đầu là
  đủ để hệ thống hiểu.
- Mỗi hoạt động có bao nhiêu ảnh cũng được (1, 2, 3, ...), không giới hạn.
- Hoạt động nào không có ảnh thì cứ để trống, không cần tạo file gì cho STT đó.

CÁC BƯỚC THỰC HIỆN
-------------------
1. Mở file uploads/mau-nhap-hoat-dong.xlsx, điền các dòng hoạt động (mỗi dòng 1
   hoạt động, đúng cột — đừng đổi thứ tự cột hay tên cột).
2. Thả ảnh minh chứng vào đúng thư mục này, đặt tên đúng quy ước ở trên, khớp với
   cột STT của dòng tương ứng trong Excel.
3. Bấm đúp file "Nhap-hang-loat.bat" ở thư mục gốc dự án.
4. Xem kết quả trên màn hình: bao nhiêu hoạt động đã tạo, có cảnh báo gì không (ví
   dụ thiếu ảnh, sai định dạng ngày, phân loại không khớp...). Sửa lại trong Excel
   rồi chạy lại nếu cần.
5. Ảnh trong thư mục này sẽ TỰ ĐỘNG BIẾN MẤT sau khi nhập thành công (đã được
   chuyển hẳn vào uploads/ và gắn đúng vào hoạt động) — đây là bình thường, không
   phải lỗi.
6. Nhờ Claude (hoặc tự làm) commit + push lên GitHub 1 lần để đưa tất cả lên trang
   thật — không cần push riêng từng hoạt động.

LƯU Ý
-----
- Cột "Ngày" trong Excel phải viết đúng dạng YYYY-MM-DD (ví dụ 2026-01-15).
- Cột "Phân loại" phải đúng 1 trong 5 nhãn: An ninh mạng / Chuyển đổi số / Đổi mới
  sáng tạo / Nghiên cứu khoa học / Khác.
- Dòng nào chưa điền "Tiêu đề hoạt động" sẽ được bỏ qua (coi như dòng trống).
`;

function ensureGuideFile() {
  const guidePath = path.join(stagingDir, GUIDE_FILENAME);
  if (!fs.existsSync(guidePath)) {
    fs.writeFileSync(guidePath, GUIDE_TEXT, "utf8");
  }
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
  const rows = loadTemplate(templatePath);

  const rowNums = Object.keys(rows)
    .map(Number)
    .filter((n) => n >= 2)
    .sort((a, b) => a - b);

  let created = 0;
  const warnings = [];

  for (const rowNum of rowNums) {
    const r = rows[rowNum];
    const title = cellText(r, COL.title);
    if (!title) continue; // dong chua dien, bo qua

    const sttRaw = cellText(r, COL.stt);
    const stt = sttRaw || String(rowNum - 1);

    const date = cellText(r, COL.date);
    let finalDate = date;
    const rawDateCell = r[COL.date];
    if (rawDateCell && typeof rawDateCell === "object" && rawDateCell.__numeric !== undefined) {
      finalDate = excelSerialToIsoDate(rawDateCell.__numeric);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
      warnings.push(`Dòng ${rowNum} (STT ${stt}, "${title}"): cột Ngày sai định dạng ("${date}"), bỏ qua dòng này.`);
      continue;
    }

    const categoryLabel = cellText(r, COL.category);
    const category = categoryFromLabel(categoryLabel);
    if (!category) {
      warnings.push(
        `Dòng ${rowNum} (STT ${stt}, "${title}"): phân loại "${categoryLabel}" không khớp danh mục nào, đã để tạm "Khác".`
      );
    }

    const location = cellText(r, COL.location);
    const body = cellText(r, COL.body);
    const linkRaw = cellText(r, COL.link);
    const videoRaw = cellText(r, COL.video);
    if (linkRaw && !isSafeUrl(linkRaw)) {
      warnings.push(`Dòng ${rowNum} (STT ${stt}, "${title}"): link tham khảo không hợp lệ, đã bỏ trống.`);
    }
    if (videoRaw && !isSafeUrl(videoRaw)) {
      warnings.push(`Dòng ${rowNum} (STT ${stt}, "${title}"): link video không hợp lệ, đã bỏ trống.`);
    }

    const baseSlug = `${finalDate}-${slugify(title)}`;
    let slug = baseSlug;
    let n = 2;
    while (fs.existsSync(path.join(eventsDir, `${slug}.json`))) {
      slug = `${baseSlug}-${n++}`;
    }

    const staged = findImagesForStt(stt);
    const images = staged.map((f, i) => {
      const destName = `${finalDate}-${slugify(title)}-${i + 1}${f.ext}`;
      fs.copyFileSync(path.join(stagingDir, f.name), path.join(uploadsDir, destName));
      fs.unlinkSync(path.join(stagingDir, f.name));
      return { image: `/uploads/${destName}`, featured: i === 0 };
    });
    if (!images.length) {
      warnings.push(
        `Dòng ${rowNum} (STT ${stt}, "${title}"): không tìm thấy ảnh nào tên bắt đầu bằng "${stt}-" trong Anh-nhap-hoat-dong/.`
      );
    }

    const data = {
      title,
      category: category || "khac",
      date: finalDate,
      location,
      body,
      images,
      link: isSafeUrl(linkRaw) ? linkRaw : "",
      video: isSafeUrl(videoRaw) ? videoRaw : "",
    };

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
