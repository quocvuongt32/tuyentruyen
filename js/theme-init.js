// Mac dinh giao dien sang. Neu nguoi dung da tung tu bam nut chuyen doi thi
// uu tien luu lua chon do o lan sau.
// File rieng (khong phai inline <script>) vi CSP cong khai (netlify.toml)
// khong co 'unsafe-inline' trong script-src - script inline se bi trinh
// duyet am tham chan, khong chay, khong bao loi ro rang o console.
try {
  var savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
} catch (e) {}
