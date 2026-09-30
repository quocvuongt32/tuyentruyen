"use strict";

const ENGAGEMENT_TOKEN_KEY = "cam-nang-an-toan-so-visitor";
let engagementToken = "";

function getVisitorToken() {
  if (engagementToken) return engagementToken;
  try {
    const saved = localStorage.getItem(ENGAGEMENT_TOKEN_KEY) || "";
    if (/^[a-zA-Z0-9_-]{20,160}$/.test(saved)) {
      engagementToken = saved;
      return saved;
    }
    const generated = `${crypto.randomUUID().replace(/-/g, "")}-${Date.now().toString(36)}`;
    localStorage.setItem(ENGAGEMENT_TOKEN_KEY, generated);
    engagementToken = generated;
    return generated;
  } catch (_) {
    engagementToken = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    return engagementToken;
  }
}

async function engagementRequest(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({ error: "Máy chủ trả về dữ liệu không hợp lệ." }));
  if (!response.ok || result.ok === false) throw new Error(result.error || `Lỗi HTTP ${response.status}`);
  return result;
}

function setTrafficValue(className, value) {
  const formatted = new Intl.NumberFormat("vi-VN").format(Number(value || 0));
  document.querySelectorAll(`.${className}`).forEach((element) => { element.textContent = formatted; });
}

function renderPopularArticles(items) {
  const list = document.getElementById("popular-articles");
  if (!list) return;
  list.innerHTML = "";
  if (!Array.isArray(items) || !items.length) {
    const empty = document.createElement("li");
    empty.className = "popular-empty";
    empty.textContent = "Chưa có dữ liệu lượt xem bài viết.";
    list.appendChild(empty);
    return;
  }
  items.forEach((item, index) => {
    const row = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "popular-rank";
    rank.textContent = String(index + 1).padStart(2, "0");
    const link = document.createElement("a");
    link.href = item.path;
    link.textContent = item.title;
    const views = document.createElement("small");
    views.textContent = `${new Intl.NumberFormat("vi-VN").format(Number(item.views || 0))} lượt xem`;
    const copy = document.createElement("span");
    copy.className = "popular-copy";
    copy.append(link, views);
    row.append(rank, copy);
    list.appendChild(row);
  });
}

async function refreshEngagementSummary() {
  try {
    const result = await engagementRequest("/api/analytics/summary");
    setTrafficValue("js-traffic-online", result.stats?.online);
    setTrafficValue("js-traffic-today", result.stats?.today);
    setTrafficValue("js-traffic-month", result.stats?.month);
    setTrafficValue("js-traffic-total", result.stats?.total);
    renderPopularArticles(result.popular);
  } catch (error) {
    console.error("Không tải được thống kê truy cập:", error);
  }
}

async function recordEngagement() {
  const visitorToken = getVisitorToken();
  const articleMatch = window.location.pathname.match(/^\/(hoat-dong|ky-nang)\/[a-z0-9-]+\/?$/);
  try {
    if (articleMatch) {
      const title = document.querySelector("h1")?.textContent?.trim() || document.title.replace(/\s*\|.*$/, "");
      await engagementRequest("/api/analytics/view", {
        method: "POST",
        body: JSON.stringify({ visitorToken, path: window.location.pathname, title }),
      });
    } else {
      await engagementRequest("/api/analytics/visit", {
        method: "POST",
        body: JSON.stringify({ visitorToken }),
      });
    }
  } catch (error) {
    console.error("Không ghi được lượt truy cập:", error);
  }
}

async function heartbeatVisit() {
  try {
    await engagementRequest("/api/analytics/visit", {
      method: "POST",
      body: JSON.stringify({ visitorToken: getVisitorToken() }),
    });
  } catch (error) {
    console.error("Không cập nhật được phiên truy cập:", error);
  }
}

function setupFeedbackForm() {
  const form = document.getElementById("feedback-form");
  if (!form) return;
  const button = document.getElementById("feedback-submit");
  const status = document.getElementById("feedback-status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    status.className = "";
    status.textContent = "Đang gửi…";
    try {
      const result = await engagementRequest("/api/messages/submit", {
        method: "POST",
        body: JSON.stringify({
          visitorToken: getVisitorToken(),
          content: form.elements.content.value,
          website: form.elements.website.value,
        }),
      });
      form.reset();
      status.className = "success";
      status.textContent = result.message || "Đã gửi tin nhắn.";
    } catch (error) {
      status.className = "error";
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupFeedbackForm();
  await recordEngagement();
  const hasSummary = Boolean(document.getElementById("popular-articles") || document.querySelector(".js-traffic-total"));
  if (hasSummary) await refreshEngagementSummary();
  window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    heartbeatVisit();
    if (hasSummary) refreshEngagementSummary();
  }, 60_000);
});
