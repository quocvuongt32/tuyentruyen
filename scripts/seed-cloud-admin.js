"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const stateDir = path.join(root, ".publisher");
const sqlPath = path.join(stateDir, "cloud-seed.sql");
const credentialsPath = path.join(stateDir, "cloud-initial-credentials.txt");
const iterations = 100_000;
const users = [
  { username: "admin", fullName: "Quản trị hệ thống", role: "admin" },
  { username: "nganpt", fullName: "Thượng tá Phạm Thị Ngân", role: "approver" },
  { username: "vuongnq", fullName: "Đại úy Nguyễn Quốc Vương", role: "author" },
];

function sql(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function makePassword() {
  return `${crypto.randomBytes(12).toString("base64url")}A7a!`;
}

fs.mkdirSync(stateDir, { recursive: true });
const now = Date.now();
const credentials = [];
const statements = users.map((user) => {
  const password = makePassword();
  const salt = crypto.randomBytes(18).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  credentials.push(`${user.username.padEnd(8)}  ${password}`);
  return `INSERT INTO users(username,full_name,role,active,must_change_password,salt,password_hash,iterations,updated_at) VALUES(${sql(user.username)},${sql(user.fullName)},${sql(user.role)},1,1,${sql(salt)},${sql(hash)},${iterations},${now}) ON CONFLICT(username) DO UPDATE SET full_name=excluded.full_name,role=excluded.role,active=1,must_change_password=1,salt=excluded.salt,password_hash=excluded.password_hash,iterations=excluded.iterations,updated_at=excluded.updated_at;`;
});

fs.writeFileSync(sqlPath, `DELETE FROM sessions WHERE username IN ('admin','nganpt','vuongnq');\n${statements.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
fs.writeFileSync(credentialsPath, [
  "CẨM NANG AN TOÀN SỐ — MẬT KHẨU TẠM BAN ĐẦU",
  "Chỉ dùng một lần. Mỗi tài khoản phải đổi mật khẩu ngay sau khi đăng nhập.",
  "",
  ...credentials,
  "",
  `Tạo lúc: ${new Date(now).toISOString()}`,
].join("\n"), { encoding: "utf8", mode: 0o600 });

console.log(`Đã tạo tệp seed: ${sqlPath}`);
console.log(`Mật khẩu tạm được lưu cục bộ tại: ${credentialsPath}`);
