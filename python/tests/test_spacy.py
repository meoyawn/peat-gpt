import json
import os
import re
from typing import Generator, List, Dict

import pytest
import spacy

nlp = spacy.load("en_core_web_trf")


def _split_paragraphs(doc) -> Generator[str, None, None]:
    start = 0
    for token in doc:
        if token.is_space and token.text.count("\n") > 1:
            yield doc[start:token.i]
            start = token.i
    yield doc[start:]


def _file_str(path: str) -> str:
    with open(path, mode="r", encoding="utf-8") as f:
        return f.read()


def _chunks(s: str, max_len: int) -> str:
    for i in range(0, len(s), max_len):
        yield s[i:i + max_len]


# split on \s+ regex and then join with a single whitespace
def _replace_whitespace_with_single_space(s: str) -> str:
    return " ".join(re.split(r'\s+', s))


def _try_parse_int(s: str) -> int | None:
    try:
        return int(s)
    except ValueError:
        return None


Chunks = List[Dict[str, str | int]]


def chunk_pdf(path: str) -> List[Dict[str, str | int]]:
    ret: Chunks = []
    doc = nlp(_file_str(path))
    page = 0

    # sentences
    paragraph: List[str] = []

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
                    paragraph.append(stripped_line)
        else:
            paragraph.append(stripped_sentence)

        # TODO check if we're about to go overboard with tokens

        if sentence.text_with_ws.endswith("\n"):
            page = _flush(page, paragraph, ret)
            paragraph = []

    return ret


def _flush(page: int, paragraph: List[str], ret: Chunks) -> int:
    excerpt = " ".join(paragraph)
    x = _try_parse_int(excerpt)
    if x:
        return x
    else:
        if len(excerpt):
            ret.append({"page": page + 1, "excerpt": excerpt})
        return page


def _remove_extension(filename: str) -> str:
    return os.path.splitext(filename)[0]


def test_paragraphs():
    path = "data/books/"
    chunks_dir = os.path.join(path, "chunks")
    os.makedirs(chunks_dir, exist_ok=True)
    for filename in os.listdir(path):
        chunks = chunk_pdf(os.path.join(path, filename))
        with open(os.path.join(chunks_dir, f"{_remove_extension(filename)}.json"), "w") as f:
            json.dump(chunks, f)
        print(filename)


@pytest.mark.skip
def test_literal():
    txt = """
    An original example paragraph for sentence segmentation.
    A second sentence provides another boundary for the tokenizer.
    """
    doc = nlp(txt)
    for sentence in doc.sents:
        print(sentence.text)
        print("----")
        # s = replace_whitespace_with_single_space(sentence.text)
        # print(s)
        #
        # lens.append(len(s))


@pytest.mark.skip
def test_foo():
    path = "data/local-input"
    doc = nlp(_file_str(path))

    lens: List[int] = []

    for sentence in doc.sents:
        s = _replace_whitespace_with_single_space(sentence.text)
        print(s)

        lens.append(len(s))

    # average length
    avg_len = sum(lens) / len(lens)
    print(avg_len)
