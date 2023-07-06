import json
import os
from typing import List, Tuple, Dict, Any, Generator

import pytest
import spacy
from spacy import Language


def _split_paragraphs_every(text: str, n_lines: int) -> Generator[str, None, None]:
    if n_lines <= 0:
        raise ValueError(f"n must be positive, got {n_lines}")

    lines = text.splitlines()
    if len(lines) <= 1:
        yield text
        return

    start = 0
    while start < len(lines):
        end = min(start + n_lines, len(lines))
        # Attempt to include next lines that do not start with uppercase letter or are empty
        while end < len(lines):
            next_line = lines[end]
            if not next_line or not next_line[0].isupper():
                end += 1
            else:
                break

        yield "\n".join(lines[start:end])
        start = end


def test_split_bug_infinite():
    assert list(_split_paragraphs_every(text="hello\nMy name is\njohn", n_lines=1)) == ['hello', 'My name is\njohn']


def test_split_bug_fail():
    assert list(_split_paragraphs_every(text="hello\nMy name is\njohn", n_lines=2)) == ['hello\nMy name is\njohn']


def test_split_every_n_lines():
    assert list(_split_paragraphs_every(
        text="Hello\nMy name is\nJohn\nI am from\nNew York\nNice to meet you",
        n_lines=3,
    )) == ['Hello\nMy name is\nJohn', 'I am from\nNew York\nNice to meet you']

    assert list(_split_paragraphs_every(text="One\nTwo\nThree\nFour\nFive", n_lines=2)) == ['One\nTwo',
                                                                                            'Three\nFour', 'Five']

    assert list(_split_paragraphs_every(text="Single line", n_lines=5)) == ['Single line']

    # Edge case: text starts with lowercase

    # Edge case: text with empty lines
    assert list(_split_paragraphs_every(text="\n\nHello\n\nMy name is\n\n", n_lines=2)) == ['\n', 'Hello\n',
                                                                                            'My name is\n', ]

    # Edge case: empty string
    assert list(_split_paragraphs_every(text="", n_lines=2)) == ['']

    # Edge case: number of lines is greater than text lines
    assert list(_split_paragraphs_every(text="Hello\nWorld", n_lines=5)) == ['Hello\nWorld']

    # Edge case: text with mixed case lines
    assert list(_split_paragraphs_every(text="Hello\nmy name is\nJohn", n_lines=2)) == ['Hello\nmy name is', 'John']


def test_split_every_n_lines_greater_n():
    assert list(_split_paragraphs_every(
        text="Hello\nMy name is\nJohn\nI am from\nNew York\nNice to meet you",
        n_lines=10,
    )) == ['Hello\nMy name is\nJohn\nI am from\nNew York\nNice to meet you']


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


def _chunk_pdf(doc) -> _Chunks:
    ret: _Chunks = []

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


def _chunk_huge(nlp: Language, text: str) -> Generator[Dict[str, Any], None, None]:
    for doc in nlp.pipe(_split_paragraphs_every(text, n_lines=1000)):
        for chunk in _chunk_pdf(doc):
            yield chunk


def test_chunk_newsletter():
    nlp = spacy.load("en_core_web_trf")

    inp = "data/web/mega-master-ray-newsletter.txt"
    out = "data/web/chunks/mega-master-ray-newsletter.json"

    text = _file_str(inp)
    obj = list(_chunk_huge(nlp, text))
    with open(out, "w") as f:
        json.dump(obj, f)


@pytest.mark.skip
def test_chunk_books():
    nlp = spacy.load("en_core_web_trf")

    path = "data/books/"
    chunks_dir = os.path.join(path, "chunks")
    os.makedirs(chunks_dir, exist_ok=True)

    for filename in os.listdir(path):
        if os.path.isdir(os.path.join(path, filename)):
            continue

        out = os.path.join(chunks_dir, f"{_remove_extension(filename)}.json")
        if os.path.exists(out):
            continue

        chunks = _chunk_pdf(nlp(_file_str(os.path.join(path, filename))))
        with open(out, "w") as f:
            json.dump(chunks, f)

        print(filename)
