import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { fromHtml } from "hast-util-from-html"
import { selectAll } from "hast-util-select"
import { expect, test } from "vitest"
import { getHref } from "../../lib/html"
import { exists } from "../../lib/node"
import { filenameWithoutExtension } from "../../lib/path"
import { splitParagraphs } from "../../lib/text"
import { tikaText } from "../../lib/tika"
import { handleLongParagraph } from "../prepare/chunk"
import chunking from "../prepare/chunking.json"
import { embedChunks } from "../prepare/embed"
import inputs from "./inputs.json"

interface Chunk {
  url: URL
  excerpt: string
  page?: number
}

const CHADNET_DIR = "data/chadnet/"

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
  "chunk chadnet first page",
  async () => {
    const { writing, selector } = inputs.chadnet
    const origin = new URL(writing.url)
    const r = await fetch(origin)
    const html = await r.text()
    const urls = selectAll(selector, fromHtml(html))
      .map(x => getHref(origin, x))
      .filter(x => !writing.exclude.includes(x.toString()))

    const chunksDir = join(CHADNET_DIR, "chunks")
    await mkdir(chunksDir, { recursive: true })

    const textDir = join(CHADNET_DIR, "text")
    await mkdir(textDir, { recursive: true })

    for (const url of urls) {
      const filename = filenameWithoutExtension(url)
      const path = join(chunksDir, `${filename}.json`)
      if (await exists(path)) continue

      let text: string
      const textPath = join(textDir, `${filename}.txt`)
      if (await exists(textPath)) {
        text = await readFile(textPath, "utf8")
      } else {
        text = await tikaText(url)
        await writeFile(textPath, text)
      }

      const { minChunkLen } = chunking

      const chunks = splitParagraphs(text).flatMap(p =>
        handleLongParagraph(p.text)
          .filter(x => x.length > minChunkLen)
          .map(excerpt => ({ excerpt, url, page: p.page } satisfies Chunk)),
      )

      await writeFile(path, JSON.stringify(chunks, null, 2))
    }
  },
  { timeout: 1_000_000 },
)

test("embed chadnet chunks", () => embedChunks(CHADNET_DIR), {
  timeout: 1_000_000,
})
