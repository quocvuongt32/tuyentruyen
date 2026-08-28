# -*- coding: utf-8 -*-
"""Nen anh trong uploads/Banner/ (co ban rat nang, toi 8MB/anh) thanh
uploads/banner-NN.jpg gon nhe de dung cho carousel logo tren header."""
import io
import os

from PIL import Image, ImageOps

ROOT = r"C:\Users\VUONGNQ\Desktop\TUYEN_TRUYEN"
SRC_DIR = os.path.join(ROOT, "uploads", "Banner")
UPLOADS = os.path.join(ROOT, "uploads")

MAX_DIM = 900
TARGET_BYTES = 220_000
MIN_QUALITY = 55

ORDER = [
    "Banner 01.jpg", "Banner 02.jpg", "Banner 03.jpg",
    "Banner 04.webp", "Banner 05.webp", "Banner 06.webp", "Banner 07.jpg",
    "Banner 8 (1).jpeg", "Banner 8 (2).jpeg", "Banner 8 (3).jpeg", "Banner 8 (4).jpeg",
    "Banner 8 (5).jpeg", "Banner 8 (6).jpeg", "Banner 8 (7).jpeg", "Banner 8 (8).jpeg",
]


def process_image(src_path, dst_path):
    img = Image.open(src_path)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    if max(w, h) > MAX_DIM:
        ratio = MAX_DIM / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    quality = 82
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
    out_names = []
    for i, fname in enumerate(ORDER, start=1):
        src_path = os.path.join(SRC_DIR, fname)
        out_name = f"banner-{i:02d}.jpg"
        out_path = os.path.join(UPLOADS, out_name)
        size, quality = process_image(src_path, out_path)
        out_names.append(out_name)
        print(f"{fname} -> {out_name} ({size/1024:.0f} KB, q={quality})")
    print(out_names)


if __name__ == "__main__":
    main()
