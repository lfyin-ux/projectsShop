#!/usr/bin/env python3
"""Generate 81x81 tab bar icons for WeChat mini program."""
from PIL import Image, ImageDraw
import os

SIZE = 81
ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets')
GRAY = (135, 152, 174, 255)   # #8798ae
BLUE = (63, 125, 228, 255)    # #3f7de4


def new_canvas():
    return Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))


def save_pair(name, draw_fn):
    for active, color in [(False, GRAY), (True, BLUE)]:
        img = new_canvas()
        draw = ImageDraw.Draw(img)
        draw_fn(draw, color)
        suffix = '-active' if active else ''
        img.save(os.path.join(ASSETS, f'tab-{name}{suffix}.png'), 'PNG')


def draw_project(draw, color):
    # 2x2 grid
    gap, cell = 8, 24
    start = (SIZE - 2 * cell - gap) // 2
    for row in range(2):
        for col in range(2):
            x = start + col * (cell + gap)
            y = start + row * (cell + gap)
            draw.rounded_rectangle([x, y, x + cell, y + cell], radius=5, fill=color)


def draw_about(draw, color):
    cx, cy = SIZE // 2, SIZE // 2 - 4
    draw.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], outline=color, width=4)
    draw.arc([cx - 22, cy + 6, cx + 22, cy + 38], start=200, end=-20, fill=color, width=4)


def draw_contact(draw, color):
    # envelope
    m = 16
    draw.rounded_rectangle([m, 22, SIZE - m, SIZE - 18], radius=6, outline=color, width=4)
    draw.line([m + 4, 26, SIZE // 2, 44, SIZE - m - 4, 26], fill=color, width=4)


if __name__ == '__main__':
    os.makedirs(ASSETS, exist_ok=True)
    save_pair('project', draw_project)
    save_pair('about', draw_about)
    save_pair('contact', draw_contact)
    print('Tab icons generated in', os.path.abspath(ASSETS))
