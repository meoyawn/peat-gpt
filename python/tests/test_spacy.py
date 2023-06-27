import json
import os
from typing import List, Tuple, Dict, Any

import spacy

nlp = spacy.load("en_core_web_trf")


def _file_str(path: str) -> str:
    with open(path, mode="r", encoding="utf-8") as f:
        return f.read()


def _try_parse_int(s: str) -> int | None:
    try:
        return int(s)
    except ValueError:
        return None


_Chunks = List[Dict[str, Any]]
_Sentences = List[Tuple[str, int]]


def _chunk_pdf(path: str) -> _Chunks:
    ret: _Chunks = []
    doc = nlp(_file_str(path))
    page = 0

    paragraph: _Sentences = []

    for sentence in doc.sents:
        if sentence.text_with_ws.startswith("\n"):
            page = _flush(page, paragraph, ret)
            paragraph = []

        stripped_sentence = sentence.text.strip()
        if "\n" in stripped_sentence:
            for line in stripped_sentence.splitlines():
                stripped_line = line.strip()
                x = _try_parse_int(stripped_line)
                if x and x > page:
                    page = x
                else:
                    paragraph.append((stripped_line, page + 1))
        else:
            paragraph.append((stripped_sentence, page + 1))

        if sentence.text_with_ws.endswith("\n"):
            page = _flush(page, paragraph, ret)
            paragraph = []

    return ret


def _flush(page: int, paragraph: _Sentences, ret: _Chunks) -> int:
    excerpt = " ".join([s for s, _ in paragraph])
    new_page = _try_parse_int(excerpt)
    if new_page:
        return new_page
    else:
        if len(excerpt):
            pages = list(set([p for (_, p) in paragraph]))
            pages.sort()
            ret.append({"pages": pages, "excerpt": excerpt, })
        return page


def _remove_extension(filename: str) -> str:
    return os.path.splitext(filename)[0]


def test_chunk_books():
    path = "data/books/"
    chunks_dir = os.path.join(path, "chunks")
    os.makedirs(chunks_dir, exist_ok=True)

    for filename in os.listdir(path):
        if os.path.isdir(os.path.join(path, filename)):
            continue

        out = os.path.join(chunks_dir, f"{_remove_extension(filename)}.json")
        if os.path.exists(out):
            continue

        chunks = _chunk_pdf(os.path.join(path, filename))
        with open(out, "w") as f:
            json.dump(chunks, f)
        print(filename)
