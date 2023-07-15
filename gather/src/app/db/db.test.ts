import { randomUUID } from "crypto"
import { readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { ResponseError, UpsertVector } from "../../../../gen/pinecone"
import { chunkArray } from "../../lib/ts"
import { mkPinecone } from "../pinecone"

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

const pineconeAPI = mkPinecone()

test(
  "delete youtube",
  async () => {
    const embeddingsDir = join(DATA_DIR, "youtube", "embeddings")
    for (const file of await readdir(embeddingsDir)) {
      const jsonPath = join(embeddingsDir, file)
      const s = await readFile(jsonPath, "utf-8")
      const arr: ReadonlyArray<Embedded> = JSON.parse(s)
      console.log(jsonPath)
      await pineconeAPI._delete({ ids: arr.map(x => x.id) })
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

test(
  "upsert dirs",
  async () => {
    for (const dir of [
      "audio",
      "books",
      "chadnet",
      "email-depository",
      // "web",
      "youtube",
    ]) {
      const embeddingsDir = join(DATA_DIR, dir, "embeddings")
      for (const file of await readdir(embeddingsDir)) {
        const jsonPath = join(embeddingsDir, file)
        const s = await readFile(jsonPath, "utf-8")
        const arr: ReadonlyArray<Embedded> = JSON.parse(s)

        const full = arr.filter(x => x.excerpt.length > 200).map(toPinecone)
        const batches = chunkArray(full, 250)
        console.log(file, batches.length)

        try {
          await Promise.all(
            batches.map(vectors => pineconeAPI.upsert({ vectors })),
          )
        } catch (e) {
          if (e instanceof ResponseError) {
            console.error(e.response.status, await e.response.text())
          }
          throw e
        }
      }
    }
  },
  {
    timeout: 1_000_000_000,
  },
)
