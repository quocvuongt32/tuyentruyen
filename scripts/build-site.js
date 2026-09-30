// Doc content/site.json (quan tri qua CMS) va ghi ra data/site.json cho
// trang tinh fetch(). Khong dung package ngoai — chi Node core (fs, path).
"use strict";

const fs = require("fs");
const path = require("path");

const srcFile = path.join(__dirname, "..", "content", "site.json");
const outDir = path.join(__dirname, "..", "data");
const outFile = path.join(outDir, "site.json");

function str(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v : fallback;
}

fs.mkdirSync(outDir, { recursive: true });

let raw;
try {
  raw = JSON.parse(fs.readFileSync(srcFile, "utf8"));
} catch (e) {
  console.warn(`[site] Không đọc được ${path.relative(process.cwd(), srcFile)}, dùng nội dung rỗng: ${e.message}`);
  raw = {};
}

const brand = raw.brand || {};
const nav = raw.nav || {};
const hero = raw.hero || {};
const timelineSection = raw.timelineSection || {};
const activitySection = raw.activitySection || {};
const footer = raw.footer || {};
const officialSources = Array.isArray(raw.officialSources) ? raw.officialSources : [];

const payload = {
  brand: {
    line1: str(brand.line1, "Cẩm nang"),
    line2: str(brand.line2, "An toàn số"),
  },
  nav: {
    trangChu: str(nav.trangChu, "Trang chủ"),
    gioiThieu: str(nav.gioiThieu, "Giới thiệu"),
    nguonChinhThong: str(nav.nguonChinhThong, "Nguồn chính thống"),
    tuyenTruyen: str(nav.tuyenTruyen, "Tuyên truyền"),
    hoatDongKhac: str(nav.hoatDongKhac, "Hoạt động khác"),
    lienHe: str(nav.lienHe, "Liên hệ"),
  },
  hero: {
    title: str(hero.title, "Cẩm nang An toàn số"),
    subtitle: str(hero.subtitle),
    ctaText: str(hero.ctaText, "Xem Cẩm nang"),
  },
  timelineSection: {
    heading: str(timelineSection.heading, "Tuyên truyền An ninh mạng"),
    hint: str(timelineSection.hint),
  },
  activitySection: {
    heading: str(activitySection.heading, "Hoạt động khác"),
    hint: str(activitySection.hint),
  },
  officialSources: officialSources
    .map((source) => ({
      name: str(source && source.name),
      description: str(source && source.description),
      url: /^https:\/\//i.test(str(source && source.url)) ? str(source.url) : "",
      icon: str(source && source.icon),
    }))
    .filter((source) => source.name && source.url),
  footer: {
    governingBody: str(footer.governingBody, "Học viện Cảnh sát nhân dân"),
    managingUnit: str(footer.managingUnit, "Khoa Toán - Tin học và Ứng dụng KHCN trong PCTP"),
    siteName: str(footer.siteName, "Website chuyên đề Cẩm nang An toàn số"),
    contentManager: str(footer.contentManager),
    technicalManager: str(footer.technicalManager),
    address: str(footer.address),
    email: str(footer.email),
    phone: str(footer.phone),
    notice: str(footer.notice),
    statusNotice: str(footer.statusNotice),
    legalDisclaimerApproved: footer.legalDisclaimerApproved === true,
    legalDisclaimer: str(footer.legalDisclaimer),
    decisionNumber: str(footer.decisionNumber),
    decisionDate: str(footer.decisionDate),
  },
};

fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
console.log(`[site] Đã ghi nội dung chung vào ${path.relative(process.cwd(), outFile)}`);
