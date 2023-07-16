import { randomUUID } from "crypto"
import { readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { ResponseError, UpsertVector } from "../../../../gen/pinecone"
import { removeExtension } from "../../lib/path"
import { arrayPromise, chunkArray } from "../../lib/ts"
import { mkPinecone } from "../pinecone"
import chunking from "../prepare/chunking.json"

interface Embedded {
  id: string
  embedding: Array<number>
  excerpt: string
  pages?: Array<number>

  [k: string]: unknown
}

const DATA_DIR = "data/"

test.skip(
  "clean embeddings",
  async () => {
    for (const dir of ["books", "web", "youtube"]) {
      const embeddingsDir = join(DATA_DIR, dir, "embeddings")
      for (const file of await readdir(embeddingsDir)) {
        const jsonPath = join(embeddingsDir, file)
        const s = await readFile(jsonPath, "utf-8")
        const arr: ReadonlyArray<Embedded> = JSON.parse(s)
        const clean = arr
          .filter(x => x.excerpt.length > 200)
          .map(x => (x.id ? x : { ...x, id: randomUUID() }))

        for (const embedded of clean) {
          if (!embedded.embedding) {
            console.error(JSON.stringify(embedded))
            throw new Error(jsonPath)
          }
        }

        await writeFile(jsonPath, JSON.stringify(clean))
      }
    }
  },
  { timeout: 1_000_000 },
)

const pinecone = mkPinecone()

test(
  "delete youtube",
  async () => {
    const embeddingsDir = join(DATA_DIR, "youtube", "embeddings")
    for (const file of await readdir(embeddingsDir)) {
      const jsonPath = join(embeddingsDir, file)
      const s = await readFile(jsonPath, "utf-8")
      const arr: ReadonlyArray<Embedded> = JSON.parse(s)
      console.log(jsonPath)
      await pinecone._delete({ ids: arr.map(x => x.id) })
    }
  },
  { timeout: 1_000_000 },
)

const toPinecone = ({
  embedding,
  id,
  pages,
  ...metadata
}: Embedded): UpsertVector => ({
  id,
  values: embedding,
  metadata: {
    ...metadata,
    pages: pages ? pages.join("-") : undefined,
  },
})

async function* embeddingPaths(
  dirs: ReadonlyArray<string>,
): AsyncGenerator<string, void> {
  for (const dir of dirs) {
    const embeddingsDir = join(DATA_DIR, dir, "embeddings")
    for (const file of await readdir(embeddingsDir)) {
      yield join(embeddingsDir, file)
    }
  }
}

test(
  "upsert dirs",
  async () => {
    const dirs = [
      // "audio",
      // "books",
      // "chadnet",
      // "email-depository",
      // "web",
      "youtube",
    ]
    const { minChunkLen } = chunking
    const paths = await arrayPromise(embeddingPaths(dirs))
    for (let i = 0; i < paths.length; i++) {
      const jsonPath = paths[i]
      const s = await readFile(jsonPath, "utf-8")
      const arr: ReadonlyArray<Embedded> = JSON.parse(s)

      const full = arr
        .filter(x => x.excerpt.length > minChunkLen)
        .map(toPinecone)
      const batches = chunkArray(full, 250)
      console.log(batches.length, removeExtension(jsonPath), i, paths.length)

      try {
        await Promise.all(batches.map(vectors => pinecone.upsert({ vectors })))
      } catch (e) {
        if (e instanceof ResponseError) {
          console.error(e.response.status, await e.response.text())
        }
        throw e
      }
    }
  },
  {
    timeout: 1_000_000_000,
  },
)
