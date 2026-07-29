"""Generate the printable Weekly Grocery Budget and Meal Planner."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "downloads" / "weekly-grocery-budget-planner.pdf"

ORANGE = colors.HexColor("#F29B30")
SLATE = colors.HexColor("#243447")
MUTED = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#CBD5E1")
WHITE = colors.white

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 42


def text(pdf, value, x, y, size=10, color=SLATE, font="Helvetica"):
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    pdf.drawString(x, y, value)


def line(pdf, x1, y1, x2, y2, color=BORDER, width=0.8):
    pdf.setStrokeColor(color)
    pdf.setLineWidth(width)
    pdf.line(x1, y1, x2, y2)


def checkbox(pdf, x, y, size=8):
    pdf.setStrokeColor(MUTED)
    pdf.setLineWidth(0.8)
    pdf.rect(x, y, size, size, fill=0, stroke=1)


def field(pdf, label, x, y, width):
    text(pdf, label.upper(), x, y + 13, 7.5, MUTED, "Helvetica-Bold")
    line(pdf, x, y, x + width, y, SLATE, 0.8)


def footer(pdf, page_number):
    line(pdf, MARGIN, 31, PAGE_WIDTH - MARGIN, 31, BORDER, 0.6)
    text(
        pdf,
        "Free tools: daily-life-hacks.com/tools/",
        MARGIN,
        18,
        7.5,
        MUTED,
    )
    page_text = f"daily-life-hacks.com  |  Page {page_number} of 2"
    text(
        pdf,
        page_text,
        PAGE_WIDTH - MARGIN - stringWidth(page_text, "Helvetica", 7.5),
        18,
        7.5,
        MUTED,
    )


def header(pdf, page_label):
    pdf.setFillColor(ORANGE)
    pdf.roundRect(MARGIN, PAGE_HEIGHT - 64, 28, 28, 7, fill=1, stroke=0)
    text(pdf, "DLH", MARGIN + 5, PAGE_HEIGHT - 53, 8, WHITE, "Helvetica-Bold")
    text(
        pdf,
        "WEEKLY GROCERY BUDGET + MEAL PLANNER",
        MARGIN + 38,
        PAGE_HEIGHT - 48,
        14,
        SLATE,
        "Helvetica-Bold",
    )
    text(
        pdf,
        page_label,
        PAGE_WIDTH - MARGIN - stringWidth(page_label, "Helvetica-Bold", 8),
        PAGE_HEIGHT - 48,
        8,
        ORANGE,
        "Helvetica-Bold",
    )


def draw_page_one(pdf):
    header(pdf, "PLAN THE WEEK")
    text(
        pdf,
        "A grocery plan is just a budget wearing dinner clothes.",
        MARGIN,
        PAGE_HEIGHT - 88,
        11,
        MUTED,
    )

    y = PAGE_HEIGHT - 123
    field(pdf, "Week of", MARGIN, y, 110)
    field(pdf, "People", MARGIN + 130, y, 70)
    field(pdf, "Weekly budget", MARGIN + 220, y, 110)
    field(pdf, "Pantry-first goal", MARGIN + 350, y, 178)

    y -= 39
    text(pdf, "DO THE PANTRY SWEEP BEFORE THE STORE DOES YOUR THINKING", MARGIN, y, 9, ORANGE, "Helvetica-Bold")
    y -= 21
    checks = [
        "Produce to use first",
        "Protein already on hand",
        "Grains, beans, and cans",
        "Freezer or leftovers",
    ]
    for index, label in enumerate(checks):
        col = index % 2
        row = index // 2
        x = MARGIN + col * 264
        yy = y - row * 23
        checkbox(pdf, x, yy - 2)
        text(pdf, label, x + 15, yy, 9, SLATE)

    table_top = y - 57
    row_height = 45
    widths = [54, 180, 142, 152]
    labels = ["DAY", "DINNER", "PLANNED LEFTOVERS", "NEED TO BUY"]
    x = MARGIN
    pdf.setFillColor(SLATE)
    pdf.rect(MARGIN, table_top - 24, sum(widths), 24, fill=1, stroke=0)
    for label, width in zip(labels, widths):
        text(pdf, label, x + 7, table_top - 16, 7.5, WHITE, "Helvetica-Bold")
        x += width

    days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    y = table_top - 24
    for index, day in enumerate(days):
        fill = LIGHT if index % 2 == 0 else WHITE
        pdf.setFillColor(fill)
        pdf.setStrokeColor(BORDER)
        pdf.rect(MARGIN, y - row_height, sum(widths), row_height, fill=1, stroke=1)
        x = MARGIN
        text(pdf, day, x + 7, y - 26, 8, ORANGE, "Helvetica-Bold")
        for width in widths[:-1]:
            x += width
            line(pdf, x, y, x, y - row_height, BORDER, 0.6)
        y -= row_height

    y -= 23
    text(pdf, "THE BUDGET GUARDRAIL", MARGIN, y, 9, ORANGE, "Helvetica-Bold")
    y -= 24
    budget_fields = [
        ("Planned groceries", 112),
        ("Pantry replacements", 112),
        ("Flex money", 92),
        ("Planned total", 112),
    ]
    x = MARGIN
    for label, width in budget_fields:
        field(pdf, label, x, y, width)
        x += width + 16

    text(
        pdf,
        "If the total is over budget here, the cart won't develop better judgment later.",
        MARGIN,
        y - 24,
        8.5,
        MUTED,
    )
    footer(pdf, 1)


def list_column(pdf, title, x, y, width, rows=8):
    pdf.setFillColor(LIGHT)
    pdf.setStrokeColor(BORDER)
    pdf.roundRect(x, y - 178, width, 178, 8, fill=1, stroke=1)
    text(pdf, title.upper(), x + 12, y - 18, 8.5, ORANGE, "Helvetica-Bold")
    yy = y - 40
    for _ in range(rows):
        checkbox(pdf, x + 12, yy - 2, 7)
        line(pdf, x + 26, yy, x + width - 12, yy, BORDER, 0.7)
        yy -= 16.5


def draw_page_two(pdf):
    header(pdf, "SHOP + CHECK")
    text(
        pdf,
        "Write what the plan needs. Skip what the pantry already volunteered.",
        MARGIN,
        PAGE_HEIGHT - 88,
        11,
        MUTED,
    )

    top = PAGE_HEIGHT - 112
    gap = 12
    col_width = (PAGE_WIDTH - 2 * MARGIN - gap) / 2
    list_column(pdf, "Produce", MARGIN, top, col_width)
    list_column(pdf, "Protein", MARGIN + col_width + gap, top, col_width)
    list_column(pdf, "Grains, beans + pantry", MARGIN, top - 191, col_width)
    list_column(pdf, "Dairy, fridge + freezer", MARGIN + col_width + gap, top - 191, col_width)

    y = top - 405
    text(pdf, "CHECKOUT MATH", MARGIN, y, 9, ORANGE, "Helvetica-Bold")
    y -= 25
    fields = [
        ("Planned total", 120),
        ("Actual total", 120),
        ("Difference", 120),
        ("Next week's note", 120),
    ]
    x = MARGIN
    for label, width in fields:
        field(pdf, label, x, y, width)
        x += width + 12

    y -= 42
    pdf.setFillColor(SLATE)
    pdf.roundRect(MARGIN, y - 101, PAGE_WIDTH - 2 * MARGIN, 101, 8, fill=1, stroke=0)
    text(pdf, "LET THE SITE HANDLE THE PARTS PAPER CAN'T", MARGIN + 15, y - 20, 9, ORANGE, "Helvetica-Bold")
    resources = [
        ("Combine and scale several recipes", "daily-life-hacks.com/tools/shopping-list-builder/"),
        ("Plan seven days with priced menus", "daily-life-hacks.com/tools/grocery-budget-calculator/"),
        ("Compare foods by price and value", "daily-life-hacks.com/food-value-database/"),
    ]
    yy = y - 42
    for label, url in resources:
        text(pdf, label, MARGIN + 15, yy, 8.5, WHITE, "Helvetica-Bold")
        text(pdf, url, MARGIN + 210, yy, 8, colors.HexColor("#FDBA74"))
        yy -= 20

    y -= 122
    text(
        pdf,
        "Plan once. Shop once. Try not to buy a fourth jar of paprika.",
        MARGIN,
        y,
        10,
        SLATE,
        "Helvetica-Bold",
    )
    footer(pdf, 2)


def build(output=OUTPUT):
    output.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(output), pagesize=letter, pageCompression=1)
    pdf.setTitle("Weekly Grocery Budget and Meal Planner")
    pdf.setAuthor("David Miller, Daily Life Hacks")
    pdf.setSubject("Two-page printable grocery budget, meal plan, and shopping list")
    draw_page_one(pdf)
    pdf.showPage()
    draw_page_two(pdf)
    pdf.showPage()
    pdf.save()
    return output


if __name__ == "__main__":
    generated = build()
    print(f"Generated {generated}")
