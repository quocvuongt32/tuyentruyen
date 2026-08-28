# -*- coding: utf-8 -*-
"""Xu ly anh minh chung tu cac thu muc goc trong uploads/ (HEIC/JPG/WEBP tho, nhieu
anh > 1MB, khong the len thang git) thanh anh .jpg toi uu duoi uploads/ (dung quy
uoc CMS: file phang, ten khong dau khong dau cach), roi cap nhat images[] trong
cac content/events/*.json tuong ung."""
import io
import json
import os

from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()

ROOT = r"C:\Users\VUONGNQ\Desktop\TUYEN_TRUYEN"
UPLOADS = os.path.join(ROOT, "uploads")
EVENTS_DIR = os.path.join(ROOT, "content", "events")

MAX_DIM = 1600
TARGET_BYTES = 950_000
MIN_QUALITY = 55

# (thu muc nguon, prefix ten file dau ra, [danh sach file event json se nhan anh])
GROUPS = [
    ("Nguyễn Thị Minh Khai", "nguyen-thi-minh-khai", [
        "2022-08-15-tuyen-truyen-pho-bien-giao-duc-phap-luat-huong-dan-su-dung-internet-va-mang-xa-hoi-an-toan-hieu-qua-dung-phap-luat-cho-hoc-sinh-truong-thpt-nguyen-thi-minh-khai-quan-bac-tu-liem-tp-ha-noi.json",
    ]),
    ("Hà Nội Arm", "ha-noi-ams", [
        "2022-10-05-la-chan-khong-gian-mang-va-tuoi-hoa-hoc-duong-cau-giay.json",
    ]),
    ("Cầu giấy 2", "cau-giay-2022-10-07", [
        "2022-10-07-la-chan-khong-gian-mang-va-tuoi-hoa-hoc-duong-cau-giay.json",
    ]),
    ("Thượng cát", "thuong-cat", [
        "2022-11-10-tuyen-truyen-pho-bien-giao-duc-phap-luat-huong-dan-su-dung-internet-va-mang-xa-hoi-an-toan-hieu-qua-dung-phap-luat-cho-hoc-sinh-truong-thpt-thuong-cat-quan-bac-tu-liem-tp-ha-noi.json",
    ]),
    ("Xuân Đỉnh", "xuan-dinh-thpt-2022", [
        "2022-11-16-tuyen-truyen-pho-bien-giao-duc-phap-luat-huong-dan-su-dung-internet-va-mang-xa-hoi-an-toan-hieu-qua-dung-phap-luat-cho-hoc-sinh-truong-thpt-xuan-dinh-quan-bac-tu-liem-tp-ha-noi.json",
    ]),
    ("Cầu giấy", "cau-giay-2023-08-29", [
        "2023-08-29-la-chan-khong-gian-mang-voi-tuoi-hoa-hoc-duong-quan-cau-giay.json",
    ]),
    ("Mai Dịch", "mai-dich", [
        "2023-10-09-tuyen-truyen-pho-bien-giao-duc-phap-luat-huong-dan-su-dung-internet-va-mang-xa-hoi-an-toan-hieu-qua-dung-phap-luat-cho-hoc-sinh-truong-thcs-mai-dich-quan-cau-giay-tp-ha-noi.json",
    ]),
    ("Ngôi sao Hà Nội", "ngoi-sao-ha-noi", [
        "2025-10-10-ky-nang-phong-chong-lua-dao-bat-coc-online-ngoi-sao-ha-noi.json",
    ]),
    ("Marie Curie", "marie-curie", [
        "2025-10-25-an-ninh-an-toan-khong-gian-mang-marie-curie.json",
        "2025-11-04-an-ninh-an-toan-tren-khong-gian-mang-cho-hoc-sinh-nha-truong.json",
        "2025-11-05-an-ninh-an-toan-tren-khong-gian-mang-cho-hoc-sinh-nha-truong.json",
        "2025-12-26-ky-nang-dam-bao-an-ninh-an-toan-tren-khong-gian-mang.json",
    ]),
    ("Đoàn Thị Điểm", "doan-thi-diem", [
        "2025-11-17-ky-nang-tu-bao-ve-ban-than-doan-thi-diem.json",
        "2025-11-24-em-an-toan-moi-luc-moi-noi.json",
    ]),
    ("Vần dính", "cao-bang-van-dinh", [
        "2023-02-05-khoa-ktt-to-chuc-thien-nguyen-tham-hoi-cong-an-xa-bien-gioi.json",
    ]),
    ("Pacop", "son-la-pacop", [
        "2024-11-16-thien-nguyen-xa-van-ho-son-la.json",
    ]),
    ("Vừ a dính", "lao-cai-vu-a-dinh", [
        "2025-12-28-hanh-trinh-se-chia-yeu-thuong-lao-cai.json",
    ]),
]


def process_image(src_path, dst_path):
    img = Image.open(src_path)
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    w, h = img.size
    if max(w, h) > MAX_DIM:
        ratio = MAX_DIM / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    quality = 85
    while True:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        size = buf.tell()
        if size <= TARGET_BYTES or quality <= MIN_QUALITY:
            break
        quality -= 8

    with open(dst_path, "wb") as f:
        f.write(buf.getvalue())
    return size, quality


def main():
    processed_groups = {}
    for folder_name, prefix, _ in GROUPS:
        if prefix in processed_groups:
            continue
        src_dir = os.path.join(UPLOADS, folder_name)
        files = sorted(os.listdir(src_dir))
        out_names = []
        for i, fname in enumerate(files, start=1):
            src_path = os.path.join(src_dir, fname)
            if not os.path.isfile(src_path):
                continue
            out_name = f"{prefix}-{i:02d}.jpg"
            out_path = os.path.join(UPLOADS, out_name)
            size, quality = process_image(src_path, out_path)
            out_names.append(out_name)
            print(f"{folder_name}/{fname} -> {out_name} ({size/1024:.0f} KB, q={quality})")
        processed_groups[prefix] = out_names

    for folder_name, prefix, event_files in GROUPS:
        out_names = processed_groups[prefix]
        images_field = [{"image": f"/uploads/{n}"} for n in out_names]
        for ef in event_files:
            path = os.path.join(EVENTS_DIR, ef)
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            data["images"] = images_field
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print(f"updated {ef} with {len(images_field)} images")


if __name__ == "__main__":
    main()
