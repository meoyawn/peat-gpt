import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { removeExtension } from "../../lib/path"
import { mkOpenAI, openAiEmbed } from "../OpenAI"

interface Chunk {
  excerpt: string
  pages: ReadonlyArray<number>
}

interface EmbeddedChunk extends Chunk {
  embedding: ReadonlyArray<number>
  book: string
}

const CHUNKS_DIR = "data/books/chunks/"
const EMBEDS_DIR = "data/books/embeddings/"

const api = mkOpenAI()

test(
  "embed books",
  async () => {
    await mkdir(EMBEDS_DIR, { recursive: true })

    for (const file of await readdir(CHUNKS_DIR)) {
      const outPath = join(EMBEDS_DIR, file)
      if (await exists(outPath)) continue

      const s = await readFile(join(CHUNKS_DIR, file), "utf-8")
      const chunks: ReadonlyArray<Chunk> = JSON.parse(s)
      const { data } = await openAiEmbed(
        api,
        chunks.map(x => x.excerpt),
      )
      const arr = data.map(
        ({ embedding }, i) =>
          ({
            ...chunks[i],
            embedding,
            book: file,
          } satisfies EmbeddedChunk),
      )
      await writeFile(outPath, JSON.stringify(arr))
    }
  },
  { timeout: 1_000_000 },
)

test.skip("sanitize chunks", async () => {
  for (const file of await readdir(EMBEDS_DIR)) {
    const s = await readFile(join(EMBEDS_DIR, file), "utf-8")
    const chunks: ReadonlyArray<EmbeddedChunk> = JSON.parse(s)
    const arr = chunks.map(x => ({ ...x, book: removeExtension(x.book) }))
    await writeFile(join(EMBEDS_DIR, file), JSON.stringify(arr))
  }
})
