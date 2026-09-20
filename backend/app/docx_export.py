import io
import re

from docx import Document

BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


def _add_inline_runs(paragraph, text: str):
    """Split text on **bold** markers and add runs accordingly."""
    pos = 0
    for m in BOLD_RE.finditer(text):
        if m.start() > pos:
            paragraph.add_run(text[pos:m.start()])
        paragraph.add_run(m.group(1)).bold = True
        pos = m.end()
    if pos < len(text):
        paragraph.add_run(text[pos:])


def _add_table(doc: Document, rows: list[list[str]]):
    if not rows:
        return
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.style = "Light Grid Accent 1"
    for r, row in enumerate(rows):
        cells = table.rows[r].cells
        for c, val in enumerate(row):
            if c < len(cells):
                cell_p = cells[c].paragraphs[0]
                _add_inline_runs(cell_p, val.strip())
                if r == 0:
                    for run in cell_p.runs:
                        run.bold = True
    doc.add_paragraph()


def markdown_to_docx(title: str, content: str) -> io.BytesIO:
    doc = Document()
    doc.add_heading(title, level=1)

    lines = content.split("\n")
    table_buffer: list[list[str]] = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if line.startswith("|") and line.endswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if not re.fullmatch(r"\s*:?-+:?\s*", "".join(cells)):
                table_buffer.append(cells)
            i += 1
            continue
        elif table_buffer:
            _add_table(doc, table_buffer)
            table_buffer = []

        if not line:
            pass
        elif line.startswith("### "):
            doc.add_heading(line[4:], level=3)
        elif line.startswith("## "):
            doc.add_heading(line[3:], level=2)
        elif line.startswith("# "):
            doc.add_heading(line[2:], level=1)
        elif line.startswith(("- ", "* ")):
            _add_inline_runs(doc.add_paragraph(style="List Bullet"), line[2:])
        elif re.match(r"^\d+\.\s", line):
            _add_inline_runs(doc.add_paragraph(style="List Number"), re.sub(r"^\d+\.\s", "", line))
        else:
            _add_inline_runs(doc.add_paragraph(), line)

        i += 1

    if table_buffer:
        _add_table(doc, table_buffer)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
