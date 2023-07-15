import { randomUUID } from "crypto"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { expect, test } from "vitest"
import { exists } from "../../lib/node"
import { chunkSentences } from "../../lib/text"
import { removeExtension } from "../../lib/path"
import { mkOpenAI, openAiEmbed } from "../OpenAI"

interface Chunk {
  excerpt: string
  url: string
}

const MAX_CHUNK_LEN = 32_000

test("chunk articles", async () => {
  const inp = "data/articles/"
  const fixedDir = "data/articles/fixed/"
  const chunksDir = "data/articles/chunks/"
  await mkdir(chunksDir, { recursive: true })

  const list = (await readdir(inp)).filter(x => x.endsWith(".txt"))
  for (const name of list) {
    const fixedPath = join(fixedDir, name)
    const e = await exists(fixedPath)
    const path = e ? fixedPath : join(inp, name)
    const slug = removeExtension(name)
    const url = `https://raypeat.com/articles/articles/${slug}.shtml`
    const outFile = join(chunksDir, `${slug}.json`)
    if (await exists(outFile)) continue

    const text = await readFile(path, "utf-8")

    const obj = text
      .split("\n")
      .flatMap(x => chunkSentences(x, MAX_CHUNK_LEN))
      .filter(x => x.length)
      .map(x => {
        expect(x.length).toBeLessThanOrEqual(MAX_CHUNK_LEN)
        return { excerpt: x, url } satisfies Chunk
      })

    await writeFile(outFile, JSON.stringify(obj, null, 2))
  }
})

interface EmbeddedChunk extends Chunk {
  id: string
  embedding: ReadonlyArray<number>
}

const api = mkOpenAI()

test(
  "embed articles",
  async () => {
    const chunksDir = "data/articles/chunks/"
    const outDir = "data/articles/embeddings/"
    await mkdir(outDir, { recursive: true })

    for (const file of await readdir(chunksDir)) {
      const outPath = join(outDir, file)
      if (await exists(outPath)) continue

      const inPath = join(chunksDir, file)
      const text = await readFile(inPath, "utf-8")
      const chunks: ReadonlyArray<Chunk> = JSON.parse(text)
      console.log(inPath, chunks.length)

      const { data } = await openAiEmbed(
        api,
        chunks.map(({ excerpt }) => excerpt),
      )
      const arr = data.map(
        ({ embedding }, i) =>
          ({
            ...chunks[i],
            embedding,
            id: randomUUID(),
          } satisfies EmbeddedChunk),
      )
      await writeFile(outPath, JSON.stringify(arr))
    }
  },
  { timeout: 1_000_000 },
)

const clean = async (dir: string) => {
  for (const file of await readdir(dir)) {
    const s = await readFile(join(dir, file), "utf-8")
    const chunks: ReadonlyArray<Chunk> = JSON.parse(s)
    const json = chunks.filter(x => x.excerpt.trim().length)
    await writeFile(join(dir, file), JSON.stringify(json, null, 2))
  }
}

test.skip("clean", async () => {
  await clean("data/articles/chunks/")
  await clean("data/articles/embeddings/")
})
