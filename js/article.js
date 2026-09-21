"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("copy-link");
  const shareButton = document.getElementById("share-link");
  const status = document.getElementById("share-status");
  const url = window.location.href;
  const title = document.title.replace(/\s*\|.*$/, "");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Đã sao chép liên kết.";
    } catch (error) {
      status.textContent = "Không thể tự sao chép. Hãy sao chép địa chỉ trên thanh trình duyệt.";
    }
  }

  copyButton?.addEventListener("click", copyLink);
  shareButton?.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        status.textContent = "Đã mở bảng chia sẻ.";
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    await copyLink();
  });
});
