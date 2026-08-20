// Thu vien dung chung: doc file .xlsx "mau-nhap-hoat-dong" va chuan hoa thanh
// danh sach hoat dong. Dung o 2 noi:
//   - scripts/import-events-xlsx.js (chay local, tu tay, tieu thu anh trong
//     thu muc Anh-nhap-hoat-dong/, ghi ra content/events/*.json rieng le)
//   - scripts/build-events.js (chay luc Netlify build, doc file .xlsx da
//     commit qua CMS, ghep truc tiep vao data/events.json, KHONG ghi/xoa gi
//     ca vi build khong the commit nguoc lai repo)
//
// Chi dung Node core (fs, zlib) - khong can npm install. .xlsx la 1 file ZIP
// chua XML ben trong, nen phan doc ZIP/XML duoi day la tu viet, khong dung
// thu vien ngoai.
"use strict";

const zlib = require("zlib");

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

function isSafeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

// ---------------------------------------------------------------------
// Doc ZIP toi thieu (End Of Central Directory + Central Directory + Local
// File Header), ho tro nen "stored" (0) va "deflate" (8) - 2 kieu duy nhat
// ma Excel/LibreOffice/Google Sheets dung khi xuat .xlsx.
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

// Excel luu ngay dang so serial (so ngay ke tu 1899-12-30) khi cell duoc go
// truc tiep va Excel tu nhan dien la kieu Date. Cot "Ngay" co the la text
// (neu dinh dang Text) hoac numeric (neu Excel tu doi) - ham nay xu ly ca 2.
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

function cellDateIso(rowData, col) {
  const v = rowData[col];
  if (v === undefined || v === null) return "";
  if (typeof v === "object" && v.__numeric !== undefined) return excelSerialToIsoDate(v.__numeric);
  return String(v).trim();
}

function loadWorkbookRows(buf) {
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

// Cot theo dung thu tu mau (khong doi ten header, khong xoa cot; co the
// them cot moi o CUOI neu can, dung doi thu tu cot da co).
const COL = {
  stt: 0,
  title: 1,
  category: 2,
  planNumber: 3,
  date: 4,
  location: 5,
  body: 6,
  link: 7,
  video: 8,
};

// Ma su kien dung de ghep anh: <Ngay dang YYYYMMDD>-<STT>. Ghep them Ngay de
// 2 lan nhap khac nhau (2 file .xlsx khac nhau, hoac cung file dien lai tu
// dong 1) khong bi trung ma dan toi gan nham anh — STT don le se lap lai
// (vd 1, 2, 3...) o moi lan dien mau moi, nhung Ngay hau nhu luon khac nhau
// giua cac lan nhap thuc te.
function computeEventCode(dateIso, sttRaw, rowNum) {
  const datePart = dateIso.replace(/-/g, "");
  const sttPart = sttRaw || String(rowNum);
  return `${datePart}-${sttPart}`;
}

// Doc toan bo workbook, tra ve danh sach hoat dong da chuan hoa (chua gan
// anh) + canh bao. Khong dong cha I/O anh/file - noi goi tu quyet dinh lam
// gi voi ket qua nay.
function parseEventsWorkbook(buf) {
  const rows = loadWorkbookRows(buf);
  const rowNums = Object.keys(rows)
    .map(Number)
    .filter((n) => n >= 2)
    .sort((a, b) => a - b);

  const items = [];
  const warnings = [];

  for (const rowNum of rowNums) {
    const r = rows[rowNum];
    const title = cellText(r, COL.title);
    if (!title) continue;

    const sttRaw = cellText(r, COL.stt);
    const dateIso = cellDateIso(r, COL.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      warnings.push(`Dòng ${rowNum} ("${title}"): cột Ngày sai định dạng, bỏ qua dòng này.`);
      continue;
    }

    const categoryLabel = cellText(r, COL.category);
    const category = categoryFromLabel(categoryLabel);
    if (!category) {
      warnings.push(`Dòng ${rowNum} ("${title}"): phân loại "${categoryLabel}" không khớp danh mục nào, đã để tạm "Khác".`);
    }
    if (!sttRaw) {
      warnings.push(`Dòng ${rowNum} ("${title}"): thiếu số ở cột STT, đã dùng số dòng Excel (${rowNum}) làm mã tạm — nếu có ảnh cho dòng này, đặt tên ảnh theo mã đã dùng ở dưới.`);
    }

    const linkRaw = cellText(r, COL.link);
    const videoRaw = cellText(r, COL.video);
    if (linkRaw && !isSafeUrl(linkRaw)) {
      warnings.push(`Dòng ${rowNum} ("${title}"): link tham khảo không hợp lệ, đã bỏ trống.`);
    }
    if (videoRaw && !isSafeUrl(videoRaw)) {
      warnings.push(`Dòng ${rowNum} ("${title}"): link video không hợp lệ, đã bỏ trống.`);
    }

    const code = computeEventCode(dateIso, sttRaw, rowNum);

    items.push({
      rowNum,
      code,
      title,
      category: category || "khac",
      planNumber: cellText(r, COL.planNumber),
      date: dateIso,
      location: cellText(r, COL.location),
      body: cellText(r, COL.body),
      link: isSafeUrl(linkRaw) ? linkRaw : "",
      video: isSafeUrl(videoRaw) ? videoRaw : "",
    });
  }

  return { items, warnings };
}

module.exports = {
  CATEGORIES,
  slugify,
  categoryFromLabel,
  isSafeUrl,
  parseEventsWorkbook,
  computeEventCode,
};
