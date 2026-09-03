#!/usr/bin/env python3
"""Generate the Superman Log app icons as PNGs (no dependencies).

Draws a dark rounded square, a red shield, and a yellow dumbbell.
Run:  python3 tools/make-icons.py
"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "icons"

BG = (18, 24, 43)        # navy
SHIELD = (216, 44, 44)   # red
BAR = (250, 204, 21)     # yellow
WHITE = (255, 255, 255)


def rounded_rect(x, y, r, size):
    """Signed test: True if (x,y) is inside a rounded square of given size."""
    cx = min(max(x, r), size - r)
    cy = min(max(y, r), size - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def point_in_poly(x, y, poly):
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y):
            xint = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < xint:
                inside = not inside
        j = i
    return inside


def in_rect(x, y, x0, y0, x1, y1):
    return x0 <= x <= x1 and y0 <= y <= y1


def shapes(size, padding):
    """Return a list of (test_fn, color) in paint order, scaled to `size`."""
    s = size
    p = padding  # fraction of the canvas kept clear around the artwork
    u = lambda v: p * s + v * (1 - 2 * p) * s  # map 0..1 -> canvas coords

    shield = [
        (u(0.50), u(0.06)), (u(0.86), u(0.20)), (u(0.86), u(0.50)),
        (u(0.50), u(0.94)), (u(0.14), u(0.50)), (u(0.14), u(0.20)),
    ]
    # Dumbbell: bar + two plates on each side
    bar = (u(0.28), u(0.46), u(0.72), u(0.54))
    plates = [
        (u(0.24), u(0.36), u(0.31), u(0.64)),
        (u(0.32), u(0.30), u(0.40), u(0.70)),
        (u(0.60), u(0.30), u(0.68), u(0.70)),
        (u(0.69), u(0.36), u(0.76), u(0.64)),
    ]

    layers = [
        (lambda x, y: rounded_rect(x, y, s * 0.22, s), BG),
        (lambda x, y: point_in_poly(x, y, shield), SHIELD),
        (lambda x, y: in_rect(x, y, *bar), BAR),
    ]
    for pl in plates:
        layers.append((lambda x, y, pl=pl: in_rect(x, y, *pl), BAR))
    return layers


def render(size, padding=0.0, opaque_bg=False, ss=3):
    layers = shapes(size, padding)
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    x = px + (sx + 0.5) / ss
                    y = py + (sy + 0.5) / ss
                    color = None
                    for test, col in layers:
                        if test(x, y):
                            color = col
                    if color is None and opaque_bg:
                        color = BG
                    if color is not None:
                        acc[0] += color[0]
                        acc[1] += color[1]
                        acc[2] += color[2]
                        acc[3] += 255
            n = ss * ss
            a = acc[3] // n
            if acc[3]:
                # un-premultiply the averaged colour against coverage
                cov = acc[3] / 255
                r, g, b = (int(acc[i] / cov) for i in range(3))
            else:
                r = g = b = 0
            row += bytes((min(r, 255), min(g, 255), min(b, 255), a))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)
    print(f"wrote {path} ({len(png)} bytes)")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    write_png(OUT / "icon-192.png", 192, render(192))
    write_png(OUT / "icon-512.png", 512, render(512))
    # Maskable icons must keep artwork inside the central 80% safe zone.
    write_png(OUT / "maskable-512.png", 512, render(512, padding=0.12, opaque_bg=True))
    # iOS ignores transparency and rounds the corners itself.
    write_png(OUT / "apple-touch-icon.png", 180, render(180, padding=0.04, opaque_bg=True))
