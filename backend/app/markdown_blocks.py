import re
from typing import Iterator

BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


def parse_blocks(content: str) -> Iterator[dict]:
    """Classify markdown-ish agent output into typed blocks: h1/h2/h3, bullet,
    number, table (collected rows), para. Shared by the docx and pptx exporters
    so both consume the same handful of markdown constructs the agent produces."""
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
            yield {"type": "table", "rows": table_buffer}
            table_buffer = []

        if not line:
            pass
        elif line.startswith("### "):
            yield {"type": "h3", "text": line[4:]}
        elif line.startswith("## "):
            yield {"type": "h2", "text": line[3:]}
        elif line.startswith("# "):
            yield {"type": "h1", "text": line[2:]}
        elif line.startswith(("- ", "* ")):
            yield {"type": "bullet", "text": line[2:]}
        elif re.match(r"^\d+\.\s", line):
            yield {"type": "number", "text": re.sub(r"^\d+\.\s", "", line)}
        else:
            yield {"type": "para", "text": line}

        i += 1

    if table_buffer:
        yield {"type": "table", "rows": table_buffer}


def split_bold(text: str) -> list[tuple[str, bool]]:
    """Split text on **bold** markers into (text, is_bold) segments."""
    segments = []
    pos = 0
    for m in BOLD_RE.finditer(text):
        if m.start() > pos:
            segments.append((text[pos:m.start()], False))
        segments.append((m.group(1), True))
        pos = m.end()
    if pos < len(text):
        segments.append((text[pos:], False))
    return segments
