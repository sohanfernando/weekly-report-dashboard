"""
Renders the ER diagram to a PNG.

Drawn to the schema in backend/src/main/resources/db/migration/V1__init.sql.
If that migration changes, this has to change with it.

Orthogonal routing with a hand-picked elbow x per relationship, rather than an
auto-router: there are only thirteen edges and choosing the lanes by hand is
what keeps them from stacking on top of each other.
"""

from PIL import Image, ImageDraw, ImageFont

# ------------------------------------------------------------------ palette
WHITE = (255, 255, 255)
INK = (20, 22, 29)
SOFT = (107, 114, 128)
RULE = (223, 225, 233)
BRAND = (79, 70, 229)
BRAND_TINT = (238, 240, 254)
PK = (180, 83, 9)      # amber, for primary keys
FK = (37, 99, 235)     # blue, for foreign keys
UK = (4, 120, 87)      # green, for unique constraints
LINE = (144, 150, 166)
LINE_DASH = (176, 181, 194)

W, H = 2160, 1420
SCALE = 2  # supersample, then downscale, so text and hairlines stay crisp

F = "C:/Windows/Fonts/"
def font(name, size):
    return ImageFont.truetype(F + name, size * SCALE)

f_title = font("segoeuib.ttf", 30)
f_sub = font("segoeui.ttf", 17)
f_table = font("segoeuib.ttf", 19)
f_field = font("consola.ttf", 15)
f_tag = font("consolab.ttf", 12)
f_card = font("consolab.ttf", 14)
f_legend = font("segoeui.ttf", 15)
f_legend_b = font("segoeuib.ttf", 15)

img = Image.new("RGB", (W * SCALE, H * SCALE), WHITE)
d = ImageDraw.Draw(img)

def S(v):
    return v * SCALE

ROW_H, HEAD_H = 30, 42

# --------------------------------------------------------------- the schema
# (field, tag) — tag is "" for a plain column.
TABLES = {
    "users": dict(x=60, y=150, w=340, fields=[
        ("id", "PK"), ("name", ""), ("email", "UK"), ("password_hash", ""),
        ("role", ""), ("job_title", ""), ("active", ""),
        ("created_at", ""), ("updated_at", ""),
    ]),
    "projects": dict(x=60, y=560, w=340, fields=[
        ("id", "PK"), ("name", ""), ("code", "UK"), ("description", ""),
        ("color", ""), ("active", ""), ("created_at", ""), ("updated_at", ""),
    ]),
    "reports": dict(x=540, y=190, w=380, fields=[
        ("id", "PK"), ("user_id", "FK UK"), ("project_id", "FK"),
        ("week_start", "UK"), ("week_end", ""), ("status", ""),
        ("current_version_id", "FK"), ("submitted_at", ""), ("reviewed_at", ""),
        ("created_at", ""), ("updated_at", ""),
    ]),
    "report_reviews": dict(x=540, y=700, w=380, fields=[
        ("id", "PK"), ("report_id", "FK"), ("version_id", "FK"),
        ("reviewer_id", "FK"), ("action", ""), ("comment", ""), ("created_at", ""),
    ]),
    "project_members": dict(x=540, y=1060, w=380, fields=[
        ("project_id", "PK FK"), ("user_id", "PK FK"),
    ]),
    "report_versions": dict(x=1080, y=300, w=420, fields=[
        ("id", "PK"), ("report_id", "FK"), ("version_no", "UK"),
        ("editable", ""), ("submitted_at", ""), ("next_week_plan", ""),
        ("notes", ""), ("links", ""), ("created_at", ""), ("updated_at", ""),
    ]),
    "version_tasks": dict(x=1660, y=120, w=400, fields=[
        ("id", "PK"), ("version_id", "FK"), ("name", ""), ("priority", ""),
        ("planned_pct", ""), ("actual_pct", ""), ("status", ""),
        ("hours_planned", ""), ("hours_spent", ""), ("deliverable", ""),
        ("sort_order", ""),
    ]),
    "version_blockers": dict(x=1660, y=560, w=400, fields=[
        ("id", "PK"), ("version_id", "FK"), ("description", ""),
        ("is_key", ""), ("resolved", ""), ("sort_order", ""),
    ]),
    "version_achievements": dict(x=1660, y=810, w=400, fields=[
        ("id", "PK"), ("version_id", "FK"), ("description", ""),
        ("is_key", ""), ("sort_order", ""),
    ]),
    "version_hours": dict(x=1660, y=1030, w=400, fields=[
        ("id", "PK"), ("version_id", "FK"), ("task_type", "UK"), ("hours", ""),
    ]),
}

for t in TABLES.values():
    t["h"] = HEAD_H + len(t["fields"]) * ROW_H


def row_y(table, field):
    """Vertical centre of a field's row, for anchoring a connector."""
    t = TABLES[table]
    idx = [f[0] for f in t["fields"]].index(field)
    return t["y"] + HEAD_H + idx * ROW_H + ROW_H // 2


def left(table):
    return TABLES[table]["x"]


def right(table):
    return TABLES[table]["x"] + TABLES[table]["w"]


# ---------------------------------------------------------------- the boxes
def draw_table(name, t):
    x, y, w, h = t["x"], t["y"], t["w"], t["h"]

    # Soft drop shadow, so boxes read as objects rather than outlines.
    d.rounded_rectangle([S(x + 3), S(y + 4), S(x + w + 3), S(y + h + 4)],
                        radius=S(6), fill=(240, 241, 245))
    d.rounded_rectangle([S(x), S(y), S(x + w), S(y + h)],
                        radius=S(6), fill=WHITE, outline=RULE, width=S(1))

    # Header
    d.rounded_rectangle([S(x), S(y), S(x + w), S(y + HEAD_H)],
                        radius=S(6), fill=BRAND)
    d.rectangle([S(x), S(y + HEAD_H - 8), S(x + w), S(y + HEAD_H)], fill=BRAND)
    d.text((S(x + 14), S(y + HEAD_H // 2)), name, font=f_table,
           fill=WHITE, anchor="lm")

    for i, (fname, tag) in enumerate(t["fields"]):
        ry = y + HEAD_H + i * ROW_H
        if i:
            d.line([S(x + 1), S(ry), S(x + w - 1), S(ry)], fill=(243, 244, 248), width=S(1))

        is_key = tag != ""
        d.text((S(x + 14), S(ry + ROW_H // 2)), fname,
               font=f_field, fill=INK if is_key else SOFT, anchor="lm")

        if tag:
            colours = {"PK": PK, "FK": FK, "UK": UK}
            parts = tag.split()
            tx = x + w - 14
            for part in reversed(parts):
                d.text((S(tx), S(ry + ROW_H // 2)), part,
                       font=f_tag, fill=colours[part], anchor="rm")
                tx -= 34


# ---------------------------------------------------------- the connectors
def dashed_line(p1, p2, colour, width, dash=10, gap=7):
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        step = dash + gap
        y = min(y1, y2)
        end = max(y1, y2)
        while y < end:
            d.line([S(x1), S(y), S(x1), S(min(y + dash, end))], fill=colour, width=S(width))
            y += step
    else:
        step = dash + gap
        x = min(x1, x2)
        end = max(x1, x2)
        while x < end:
            d.line([S(x), S(y1), S(min(x + dash, end)), S(y1)], fill=colour, width=S(width))
            x += step


def arrow(x, y, facing):
    """Small solid triangle at the target end."""
    s = 7
    pts = ([(x, y), (x - s, y - s + 2), (x - s, y + s - 2)] if facing == "right"
           else [(x, y), (x + s, y - s + 2), (x + s, y + s - 2)])
    d.polygon([(S(px), S(py)) for px, py in pts], fill=LINE)


def connect(src, src_field, dst, dst_field, elbow, one="1", many="N",
            dashed=False, enter=None):
    """
    Orthogonal three-segment route. The elbow x is chosen per relationship so
    parallel runs sit in their own lane instead of overlapping.
    """
    y1 = row_y(src, src_field)
    y2 = row_y(dst, dst_field)
    # enter overrides the default side. Two tables in the same column need it:
    # routing into the far edge would draw the line straight through the box.
    going_right = TABLES[src]["x"] < TABLES[dst]["x"]
    enter_left = (enter == "left") if enter else going_right

    x1 = right(src) if going_right else left(src)
    x2 = left(dst) if enter_left else right(dst)
    colour = LINE_DASH if dashed else LINE

    if dashed:
        dashed_line((x1, y1), (elbow, y1), colour, 2)
        dashed_line((elbow, y1), (elbow, y2), colour, 2)
        dashed_line((elbow, y2), (x2, y2), colour, 2)
    else:
        d.line([S(x1), S(y1), S(elbow), S(y1)], fill=colour, width=S(2))
        d.line([S(elbow), S(y1), S(elbow), S(y2)], fill=colour, width=S(2))
        d.line([S(elbow), S(y2), S(x2), S(y2)], fill=colour, width=S(2))

    arrow(x2, y2, "right" if enter_left else "left")

    # Cardinality sits just off each endpoint, on the outside of the line.
    ox = 16 if going_right else -16
    # Sign flipped relative to ox: the label belongs outside the box it points
    # into, so entering from the left puts it further left, not inside.
    ox2 = 16 if enter_left else -16
    d.text((S(x1 + ox), S(y1 - 13)), one, font=f_card, fill=SOFT, anchor="mm")
    d.text((S(x2 - ox2), S(y2 - 13)), many, font=f_card, fill=SOFT, anchor="mm")


for name, t in TABLES.items():
    draw_table(name, t)

# users / projects into reports and the join table
connect("users", "id", "reports", "user_id", 470)
connect("projects", "id", "reports", "project_id", 500, many="0..N")
connect("users", "id", "project_members", "user_id", 440)
connect("projects", "id", "project_members", "project_id", 460)

# reports into its versions, and the denormalised pointer back
connect("reports", "id", "report_versions", "report_id", 1010)
connect("reports", "current_version_id", "report_versions", "id", 990,
        many="1", dashed=True)

# a version owns its content
connect("report_versions", "id", "version_tasks", "version_id", 1580)
connect("report_versions", "id", "version_blockers", "version_id", 1560)
connect("report_versions", "id", "version_achievements", "version_id", 1600)
connect("report_versions", "id", "version_hours", "version_id", 1620)

# the review trail
connect("reports", "id", "report_reviews", "report_id", 470, enter="left")
connect("report_versions", "id", "report_reviews", "version_id", 1000)
connect("users", "id", "report_reviews", "reviewer_id", 490)

# ------------------------------------------------------------------ titles
d.text((S(60), S(48)), "Weekly Report Generator & Team Dashboard", font=f_title,
       fill=INK, anchor="lm")
d.text((S(60), S(88)),
       "Entity Relationship Diagram  ·  MySQL 8.4  ·  10 tables, schema managed by Flyway (V1__init.sql)",
       font=f_sub, fill=SOFT, anchor="lm")

# ------------------------------------------------------------------ legend
LY = 1250
d.line([S(60), S(LY - 26), S(W - 60), S(LY - 26)], fill=RULE, width=S(1))

def key_swatch(x, label, colour, text):
    d.text((S(x), S(LY)), label, font=f_tag, fill=colour, anchor="lm")
    d.text((S(x + 40), S(LY)), text, font=f_legend, fill=SOFT, anchor="lm")

key_swatch(60, "PK", PK, "Primary key")
key_swatch(260, "FK", FK, "Foreign key")
key_swatch(460, "UK", UK, "Part of a unique constraint")

d.line([S(800), S(LY), S(860), S(LY)], fill=LINE, width=S(2))
arrow(860, LY, "right")
d.text((S(880), S(LY)), "One to many", font=f_legend, fill=SOFT, anchor="lm")

dashed_line((1060, LY), (1120, LY), LINE_DASH, 2)
arrow(1120, LY, "right")
d.text((S(1140), S(LY)), "Denormalised pointer to the version in play",
       font=f_legend, fill=SOFT, anchor="lm")

# The one note that explains why the schema is shaped this way.
NY = LY + 46
d.text((S(60), S(NY)), "Why content hangs off a version:", font=f_legend_b,
       fill=INK, anchor="lm")
d.text((S(60), S(NY + 30)),
       "reports holds ownership, week and status only. report_versions holds immutable snapshots of the content, and tasks, blockers,",
       font=f_legend, fill=SOFT, anchor="lm")
d.text((S(60), S(NY + 56)),
       "achievements and hours are keyed to a snapshot rather than to the report. Submitting freezes a version; requesting changes clones it into the",
       font=f_legend, fill=SOFT, anchor="lm")
d.text((S(60), S(NY + 82)),
       "next version number. Each row in report_reviews records the version_id it was written against, so a comment stays tied to the text it reviewed.",
       font=f_legend, fill=SOFT, anchor="lm")

out = r"D:\Projects\sisenco-digital-assignment\docs\er-diagram.png"
import os
os.makedirs(os.path.dirname(out), exist_ok=True)
img.resize((W, H), Image.LANCZOS).save(out, "PNG", optimize=True)
print("wrote", out, os.path.getsize(out), "bytes")
