"use strict";

const form = document.getElementById("login-form");
const button = document.getElementById("login-button");
const errorBox = document.getElementById("login-error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "Đang kiểm tra…";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      }),
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.error || "Không đăng nhập được.");
    window.location.replace("/admin");
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Đăng nhập";
  }
});
