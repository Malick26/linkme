#!/usr/bin/env python3
"""Génère les images placeholder du seed de démo (aucune image protégée — brief annexe A, DECISIONS D14).

Sortie : apps/web/public/seed/{bg-sunset,thumb-*}-{w}.webp + seed-images.json (dimensions, placeholder).
Usage : python3 infra/scripts/gen_seed_images.py   (Pillow requis)
"""
import base64
import io
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "apps", "web", "public", "seed")
random.seed(7)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vgrad(w, h, stops):
    """stops: [(pos 0..1, (r,g,b)), ...]"""
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        t = y / (h - 1)
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                lt = (t - stops[i][0]) / max(1e-6, stops[i + 1][0] - stops[i][0])
                c = lerp(stops[i][1], stops[i + 1][1], lt)
                break
        for x in range(w):
            px[x, y] = c
    return im


def glow(im, cx, cy, r, color, alpha):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(24, 0, -1):
        rr = r * i / 24
        a = int(alpha * (1 - i / 24) ** 1.6)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color + (a,))
    im.alpha_composite(layer)


def palm(d, x, base_y, top_y, lean, s, color):
    # tronc courbe
    pts = []
    for i in range(40):
        t = i / 39
        px = x + lean * (t ** 1.6)
        py = base_y + (top_y - base_y) * t
        pts.append((px, py))
    for i in range(len(pts) - 1):
        wdt = int(s * (0.05 - 0.025 * i / len(pts)))
        d.line([pts[i], pts[i + 1]], fill=color, width=max(3, wdt))
    tx, ty = pts[-1]
    # palmes
    for k in range(11):
        ang = math.radians(-180 + k * 18 + random.uniform(-6, 6))
        length = s * random.uniform(0.42, 0.62)
        frond = []
        for i in range(30):
            t = i / 29
            fx = tx + math.cos(ang) * length * t
            fy = ty + math.sin(ang) * length * t + (length * 0.55) * t * t
            frond.append((fx, fy))
        for i in range(len(frond) - 1):
            d.line([frond[i], frond[i + 1]], fill=color, width=max(2, int(s * 0.022 * (1 - i / 30)) + 2))
            if i % 2 == 0:
                fx, fy = frond[i]
                leaf = s * 0.07 * (1 - i / 30)
                d.line([(fx, fy), (fx + leaf * 0.4, fy + leaf)], fill=color, width=2)
                d.line([(fx, fy), (fx - leaf * 0.4, fy + leaf)], fill=color, width=2)


def background(size=2400):
    W = H = size
    sky = vgrad(W, H, [
        (0.0, (70, 88, 110)),
        (0.18, (122, 136, 150)),
        (0.36, (186, 170, 150)),
        (0.47, (238, 160, 92)),
        (0.53, (250, 186, 110)),
        (0.56, (60, 58, 70)),
        (1.0, (8, 9, 12)),
    ]).convert("RGBA")
    d = ImageDraw.Draw(sky, "RGBA")
    # nuages
    for _ in range(38):
        cx = random.uniform(0.35, 1.05) * W
        cy = random.uniform(0.08, 0.42) * H
        w = random.uniform(0.08, 0.26) * W
        h = random.uniform(0.006, 0.02) * H
        warm = cy / H
        col = lerp((96, 104, 118), (246, 150, 90), min(1, warm * 2.1))
        d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=col + (90,))
    sky = sky.filter(ImageFilter.GaussianBlur(6))
    glow(sky, int(0.9 * W), int(0.515 * H), int(0.28 * W), (255, 176, 90), 150)
    glow(sky, int(0.9 * W), int(0.515 * H), int(0.035 * W), (255, 236, 190), 255)
    d = ImageDraw.Draw(sky, "RGBA")
    # mer
    d.rectangle([0, int(0.525 * H), W, int(0.6 * H)], fill=(36, 52, 74, 255))
    for i in range(60):
        y = int((0.53 + i * 0.0012) * H)
        x0 = int(0.72 * W + random.uniform(-40, 40))
        d.line([(x0, y), (x0 + random.uniform(80, 260), y)], fill=(255, 170, 96, 120), width=2)
    # côte + ville
    pts = [(0.35 * W, 0.6 * H)]
    x = 0.35 * W
    while x < W:
        x += random.uniform(20, 70)
        pts.append((x, H * (0.575 - random.uniform(0, 0.02))))
    pts += [(W, 0.68 * H), (0.35 * W, 0.68 * H)]
    d.polygon(pts, fill=(26, 26, 32, 255))
    for _ in range(420):
        lx = random.uniform(0.4, 1.0) * W
        ly = random.uniform(0.585, 0.67) * H
        d.ellipse([lx, ly, lx + 3, ly + 3], fill=(255, 196, 120, random.randint(90, 220)))
    # immeuble / terrasse gauche
    d.rectangle([0, int(0.0 * H), int(0.24 * W), H], fill=(30, 31, 36, 255))
    for k in range(6):
        y = int((0.08 + k * 0.1) * H)
        d.rectangle([0, y, int(0.26 * W), y + 10], fill=(58, 60, 66, 255))
        d.rectangle([int(0.02 * W), y + 12, int(0.24 * W), y + int(0.07 * H)], fill=(70, 80, 92, 110))
    # palmiers
    dp = ImageDraw.Draw(sky)
    palm(dp, 0.33 * W, 0.62 * H, 0.1 * H, 0.03 * W, 0.42 * W, (18, 20, 22))
    palm(dp, 0.46 * W, 0.6 * H, 0.2 * H, -0.02 * W, 0.3 * W, (22, 24, 26))
    palm(dp, 0.2 * W, 0.5 * H, 0.2 * H, 0.02 * W, 0.26 * W, (16, 17, 19))
    # rambarde verre
    d.rectangle([int(0.6 * W), int(0.66 * H), W, int(0.72 * H)], fill=(40, 44, 52, 255))
    d.line([(int(0.6 * W), int(0.66 * H)), (W, int(0.66 * H))], fill=(210, 210, 215, 120), width=4)
    # sol / terrasse
    d.polygon([(0, 0.72 * H), (W, 0.7 * H), (W, H), (0, H)], fill=(20, 20, 22, 255))
    # voiture (silhouette)
    d.rounded_rectangle([int(-0.05 * W), int(0.63 * H), int(0.36 * W), int(0.86 * H)], radius=140, fill=(12, 13, 16, 255))
    d.line([(0, int(0.67 * H)), (int(0.3 * W), int(0.66 * H))], fill=(70, 74, 82, 160), width=5)
    # (pas de silhouette humaine : le créateur remplace le fond par sa photo)
    # grain
    img = sky.convert("RGB").filter(ImageFilter.GaussianBlur(3.5))
    noise = Image.effect_noise((W, H), 18).convert("RGB")
    img = Image.blend(img, noise, 0.035)
    return img


def thumb(kind, w=480, h=368):
    if kind == "travel":
        im = vgrad(w, h, [(0, (120, 170, 214)), (0.35, (200, 214, 222)), (0.45, (40, 150, 170)), (1, (18, 86, 110))]).convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        d.polygon([(0, h * 0.4), (w * 0.3, h * 0.25), (w * 0.6, h * 0.38), (w, h * 0.3), (w, h * 0.55), (w * 0.2, h), (0, h)], fill=(58, 96, 52, 255))
        for _ in range(160):
            x = random.uniform(0.05, 0.9) * w
            y = random.uniform(0.38, 0.95) * h
            if y < h * (0.42 + (x / w) * 0.2):
                continue
            c = random.choice([(240, 236, 226), (226, 150, 90), (250, 250, 250), (200, 110, 70)])
            d.rectangle([x, y, x + random.uniform(6, 14), y + random.uniform(5, 10)], fill=c + (255,))
        for _ in range(12):
            x = random.uniform(0.02, 0.35) * w
            y = random.uniform(0.6, 0.95) * h
            d.ellipse([x, y, x + 8, y + 4], fill=(255, 255, 255, 220))
    elif kind == "shop":
        im = vgrad(w, h, [(0, (46, 44, 42)), (1, (12, 12, 13))]).convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        d.rounded_rectangle([w * 0.18, h * 0.18, w * 0.82, h * 1.1], radius=110, fill=(20, 20, 22, 255))
        d.arc([w * 0.32, h * 0.02, w * 0.68, h * 0.4], 180, 360, fill=(60, 60, 64, 255), width=16)
        d.rounded_rectangle([w * 0.3, h * 0.55, w * 0.7, h * 0.8], radius=22, outline=(70, 70, 76, 255), width=4)
        d.ellipse([w * 0.47, h * 0.62, w * 0.53, h * 0.7], fill=(235, 235, 235, 255))
        glow(im, int(w * 0.1), int(h * 0.1), int(w * 0.4), (230, 200, 170), 70)
    elif kind == "music":
        im = vgrad(w, h, [(0, (40, 8, 60)), (0.6, (120, 30, 150)), (1, (20, 6, 30))]).convert("RGBA")
        glow(im, int(w * 0.52), int(h * 0.35), int(w * 0.5), (230, 120, 255), 170)
        beams = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        bd = ImageDraw.Draw(beams)
        for k in range(9):
            x = w * (0.05 + k * 0.11)
            bd.polygon([(w * 0.52, h * 0.3), (x - 14, h), (x + 14, h)], fill=(255, 210, 255, 50))
        im.alpha_composite(beams.filter(ImageFilter.GaussianBlur(4)))
        d = ImageDraw.Draw(im, "RGBA")
        for _ in range(140):
            x = random.uniform(-0.02, 1.02) * w
            y = random.uniform(0.72, 1.0) * h
            r = random.uniform(9, 17)
            d.ellipse([x - r, y - r, x + r, y + r * 3], fill=(12, 4, 18, 255))
            if random.random() < 0.15:
                d.line([(x, y), (x + random.uniform(-10, 10), y - 40)], fill=(12, 4, 18, 255), width=6)
    elif kind == "content":
        im = vgrad(w, h, [(0, (58, 50, 44)), (1, (14, 13, 12))]).convert("RGBA")
        for _ in range(14):
            glow(im, int(random.uniform(0.5, 1) * w), int(random.uniform(0, 0.5) * h), int(random.uniform(14, 40)), (255, 170, 90), 90)
        d = ImageDraw.Draw(im, "RGBA")
        d.rounded_rectangle([w * 0.08, h * 0.3, w * 0.62, h * 0.72], radius=18, fill=(22, 22, 24, 255))
        d.rounded_rectangle([w * 0.16, h * 0.18, w * 0.4, h * 0.32], radius=10, fill=(28, 28, 30, 255))
        d.ellipse([w * 0.44, h * 0.3, w * 0.86, h * 0.86], fill=(18, 18, 20, 255))
        d.ellipse([w * 0.52, h * 0.4, w * 0.78, h * 0.76], fill=(42, 48, 60, 255))
        d.ellipse([w * 0.59, h * 0.49, w * 0.7, h * 0.65], fill=(120, 150, 190, 180))
        d.ellipse([w * 0.66, h * 0.66, w * 0.98, h * 1.08], fill=(88, 60, 48, 255))
    else:  # contact
        im = vgrad(w, h, [(0, (70, 72, 76)), (1, (26, 27, 30))]).convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        d.polygon([(w * 0.02, h * 0.5), (w * 0.62, h * 0.38), (w * 0.8, h * 0.72), (w * 0.12, h * 0.95)], fill=(160, 164, 170, 255))
        d.polygon([(w * 0.06, h * 0.55), (w * 0.6, h * 0.44), (w * 0.74, h * 0.7), (w * 0.14, h * 0.88)], fill=(40, 42, 46, 255))
        d.polygon([(w * 0.2, h * 0.05), (w * 0.72, h * 0.0), (w * 0.62, h * 0.38), (w * 0.08, h * 0.46)], fill=(30, 32, 36, 255))
        d.polygon([(w * 0.24, h * 0.1), (w * 0.68, h * 0.06), (w * 0.6, h * 0.34), (w * 0.14, h * 0.41)], fill=(212, 150, 90, 200))
        d.rounded_rectangle([w * 0.78, h * 0.2, w * 0.95, h * 0.62], radius=16, fill=(16, 16, 18, 255))
    return im.convert("RGB").filter(ImageFilter.GaussianBlur(0.8))


def lqip(img):
    small = img.copy()
    small.thumbnail((16, 16))
    buf = io.BytesIO()
    small.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def save_variants(img, name, widths, manifest):
    for w in widths:
        h = round(img.height * w / img.width)
        img.resize((w, h), Image.LANCZOS).save(os.path.join(OUT, f"{name}-{w}.webp"), "WEBP", quality=78, method=6)
    manifest[name] = {"width": img.width, "height": img.height, "widths": widths, "placeholder": lqip(img)}


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    save_variants(background(), "bg-sunset", [640, 1080, 1600, 2400], manifest)
    for k in ["travel", "shop", "music", "content", "contact"]:
        save_variants(thumb(k), f"thumb-{k}", [240, 480], manifest)
    with open(os.path.join(OUT, "seed-images.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print("ok", OUT)


if __name__ == "__main__":
    main()
