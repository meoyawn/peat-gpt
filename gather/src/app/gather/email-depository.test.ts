import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { fromHtml } from "hast-util-from-html"
import { select, selectAll } from "hast-util-select"
import { toText } from "hast-util-to-text"
import { expect, test } from "vitest"
import { getHref } from "../../lib/html"
import { exists } from "../../lib/node"
import { handleLongParagraph } from "../prepare/chunk"
import chunking from "../prepare/chunking.json"
import { embedChunks } from "../prepare/embed"
import inputs from "./inputs.json"

const pathLastTwo = (u: URL): string =>
  u.pathname
    .split("/")
    .slice(-2)
    .filter(x => x.trim())
    .join("-")

test("path last two", () => {
  expect(pathLastTwo(new URL("https://www.example.com/one/two/three"))).toBe(
    "two-three",
  )
  expect(
    pathLastTwo(
      new URL(
        "https://raypeatforum.com/community/threads/ray-peat-email-advice-depository.1035/",
      ),
    ),
  ).toBe("ray-peat-email-advice-depository.1035")
})

async function* pageURLs(): AsyncGenerator<URL, void> {
  const { home, nextSelector } = inputs.emailDepository

  let url = new URL(home)

  while (true) {
    yield url

    const r = await fetch(url)
    const html = await r.text()
    const next = select(nextSelector, fromHtml(html))
    if (!next) break

    url = getHref(url, next)
  }
}

interface Chunk {
  excerpt: string
  url: URL
}

const DEPOSITORY_DIR = "data/email-depository/"

test(
  "chunk email depository",
  async () => {
    const { postSelector, trashText } = inputs.emailDepository
    const { chunkLen, overlapLen } = chunking.longParagraphs

    const chunksDir = join(DEPOSITORY_DIR, "chunks")
    await mkdir(chunksDir, { recursive: true })

    for await (const url of pageURLs()) {
      const outPath = join(chunksDir, `${pathLastTwo(url)}.json`)
      if (await exists(outPath)) continue

      console.log(url.toString())
      const r = await fetch(url, { redirect: "follow" })
      const html = await r.text()

      const chunks = selectAll(postSelector, fromHtml(html))
        .map(x => toText(x).trim().replaceAll(trashText, ""))
        .flatMap(handleLongParagraph)
        .filter(x => x.length)
        .map(excerpt => ({ excerpt, url } satisfies Chunk))

      await writeFile(outPath, JSON.stringify(chunks, null, 2))
    }
  },
  { timeout: 1_000_000 },
)

test("embed email depository", () => embedChunks(DEPOSITORY_DIR), {
  timeout: 1_000_000,
})
