import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { fromHtml } from "hast-util-from-html"
import { selectAll } from "hast-util-select"
import { expect, test } from "vitest"
import { getHref } from "../../lib/html"
import { exists } from "../../lib/node"
import { filenameWithoutExtension } from "../../lib/path"
import { splitParagraphs, splitSentences } from "../../lib/text"
import { tikaText } from "../../lib/tika"
import chunking from "../prepare/chunking.json"
import inputs from "./inputs.json"

interface Chunk {
  url: URL
  excerpt: string
  page?: number
}

const CHUNKS_DIR = "data/chadnet/chunks/"

test.skip(
  "paragraph pages",
  async () => {
    expect(
      splitParagraphs(await tikaText(new URL(inputs.books[0]))).some(x =>
        Boolean(x.page),
      ),
    ).toBe(true)

    expect(
      splitParagraphs(
        await tikaText(
          new URL("https://wiki.chadnet.org/the-great-fish-oil-experiment"),
        ),
      ).some(x => Boolean(x.page)),
    ).toBe(false)
  },
  {
    timeout: 1_000_000,
  },
)

test(
  "chadnet first page",
  async () => {
    const { writing, selector } = inputs.chadnet
    const origin = new URL(writing.url)
    const r = await fetch(origin)
    const html = await r.text()
    const urls = selectAll(selector, fromHtml(html))
      .map(x => getHref(origin, x))
      .filter(x => !writing.exclude.includes(x.toString()))

    await mkdir(CHUNKS_DIR, { recursive: true })

    for (const url of urls) {
      const path = join(CHUNKS_DIR, `${filenameWithoutExtension(url)}.json`)
      if (await exists(path)) continue

      const text = await tikaText(url)
      const chunks = splitParagraphs(text).flatMap(p =>
        splitSentences(p.text, 32_000)
          .filter(x => x.length > chunking.minChunkLen)
          .map(excerpt => ({ excerpt, url, page: p.page } satisfies Chunk)),
      )

      await writeFile(path, JSON.stringify(chunks, null, 2))
    }
  },
  { timeout: 1_000_000 },
)
