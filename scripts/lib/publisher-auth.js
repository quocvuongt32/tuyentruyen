"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROLES = new Set(["admin", "author", "approver"]);
const DEFAULT_USERS = [
  { username: "admin", fullName: "Quản trị hệ thống", role: "admin" },
  { username: "nganpt", fullName: "Thượng tá Phạm Thị Ngân", role: "approver" },
  { username: "vuongnq", fullName: "Đại úy Nguyễn Quốc Vương", role: "author" },
];

function safeEqualHex(left, right) {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

function hashPassword(password, salt = crypto.randomBytes(18).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 12) throw new Error("Mật khẩu mới phải có ít nhất 12 ký tự.");
  if (!/[A-ZÀ-Ỹ]/u.test(value) || !/[a-zà-ỹ]/u.test(value) || !/\d/.test(value)) {
    throw new Error("Mật khẩu phải có chữ hoa, chữ thường và chữ số.");
  }
  return value;
}

function publicUser(user) {
  return {
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    active: user.active !== false,
    mustChangePassword: user.mustChangePassword === true,
  };
}

function createAuthStore(root, stateDirOverride = "") {
  const stateDir = stateDirOverride ? path.resolve(stateDirOverride) : path.join(root, ".publisher");
  const usersPath = path.join(stateDir, "users.json");

  function writeStore(store) {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(usersPath, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  }

  function loadStore() {
    const store = JSON.parse(fs.readFileSync(usersPath, "utf8"));
    if (!store || !Array.isArray(store.users)) throw new Error("Tệp tài khoản nội bộ không hợp lệ.");
    return store;
  }

  function initialize() {
    fs.mkdirSync(stateDir, { recursive: true });
    if (fs.existsSync(usersPath)) return [];
    const credentials = [];
    const users = DEFAULT_USERS.map((item) => {
      const password = `${crypto.randomBytes(9).toString("base64url")}A7a`;
      const passwordData = hashPassword(password);
      credentials.push({ username: item.username, password, fullName: item.fullName, role: item.role });
      return { ...item, ...passwordData, active: true, mustChangePassword: true, updatedAt: new Date().toISOString() };
    });
    writeStore({ version: 1, users });
    return credentials;
  }

  function verify(username, password) {
    const normalized = String(username || "").trim().toLowerCase();
    const user = loadStore().users.find((item) => item.username === normalized);
    const actual = hashPassword(String(password || ""), user?.salt || "0".repeat(36));
    if (!user || user.active === false) return null;
    return safeEqualHex(actual.hash, user.hash) ? publicUser(user) : null;
  }

  function listUsers() {
    return loadStore().users.map(publicUser);
  }

  function changePassword(username, currentPassword, newPassword) {
    const store = loadStore();
    const user = store.users.find((item) => item.username === username);
    if (!user || !verify(username, currentPassword)) throw new Error("Mật khẩu hiện tại không đúng.");
    const value = validatePassword(newPassword);
    Object.assign(user, hashPassword(value), { mustChangePassword: false, updatedAt: new Date().toISOString() });
    writeStore(store);
    return publicUser(user);
  }

  function resetPassword(username, newPassword) {
    const store = loadStore();
    const user = store.users.find((item) => item.username === String(username || "").toLowerCase());
    if (!user) throw new Error("Không tìm thấy tài khoản.");
    const value = validatePassword(newPassword);
    Object.assign(user, hashPassword(value), { mustChangePassword: true, updatedAt: new Date().toISOString() });
    writeStore(store);
    return publicUser(user);
  }

  function updateUser(username, changes) {
    const store = loadStore();
    const user = store.users.find((item) => item.username === String(username || "").toLowerCase());
    if (!user) throw new Error("Không tìm thấy tài khoản.");
    const role = String(changes.role || user.role);
    if (!ROLES.has(role)) throw new Error("Vai trò tài khoản không hợp lệ.");
    const fullName = String(changes.fullName || "").replace(/\s+/g, " ").trim();
    if (!fullName || fullName.length > 160) throw new Error("Họ tên tài khoản không hợp lệ.");
    const active = changes.active !== false;
    const activeAdmins = store.users.filter((item) => item.active !== false && item.role === "admin" && item.username !== user.username);
    if (user.role === "admin" && (!active || role !== "admin") && activeAdmins.length === 0) {
      throw new Error("Phải giữ lại ít nhất một tài khoản quản trị đang hoạt động.");
    }
    Object.assign(user, { fullName, role, active, updatedAt: new Date().toISOString() });
    writeStore(store);
    return publicUser(user);
  }

  return { changePassword, initialize, listUsers, resetPassword, stateDir, updateUser, verify };
}

module.exports = { createAuthStore };
