import { randomUUID } from "crypto"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { ResponseError } from "../../../../gen/openai"
import { exists } from "../../lib/node"
import { chunkArray } from "../../lib/ts"
import { mkOpenAI, openAiEmbed } from "../OpenAI"

const CHUNKS_DIR = "data/web/chunks/"
const EMBEDDINGS_DIR = "data/web/embeddings/"

interface WebChunk {
  excerpt: string
}

interface WebEmbedding extends WebChunk {
  id: string
  url: string
  embedding: ReadonlyArray<number>
}

const EMAILS_SLUG = "Ray_Peat_Email_Exchanges"
const NEWSLETTER_SLUG = "mega-master-ray-newsletter"

test("chunk emails", async () => {
  const s = await readFile(`data/web/${EMAILS_SLUG}.txt`, "utf-8")
  const arr = s
    .split("\n")
    .flatMap(x => {
      const trimmed = x.trim()
      return trimmed ? [trimmed] : []
    })
    .map(excerpt => ({ excerpt } satisfies WebChunk))
  await writeFile(
    join(CHUNKS_DIR, `${EMAILS_SLUG}.json`),
    JSON.stringify(arr, null, 2),
  )
})

const getURL = (file: string) => {
  switch (true) {
    case file.includes(EMAILS_SLUG):
      return `https://raypeatforum.com/wiki/index.php/${EMAILS_SLUG}`

    case file.includes(NEWSLETTER_SLUG):
      return `https://archive.org/details/${NEWSLETTER_SLUG}`

    default:
      throw new Error(file)
  }
}

const api = mkOpenAI()

const batched = async (
  input: ReadonlyArray<string>,
  url: string,
): Promise<ReadonlyArray<WebEmbedding>> => {
  try {
    const { data } = await openAiEmbed(api, input)
    return data.map(({ embedding }, i) => {
      if (!embedding) throw new Error(JSON.stringify(data))

      return {
        id: randomUUID(),
        excerpt: input[i],
        url,
        embedding,
      }
    })
  } catch (e) {
    if (e instanceof ResponseError) {
      console.log(input)
      console.error(await e.response.text())
    }
    throw e
  }
}

const delay = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

test("sanitize chunks", async () => {
  const clean = async (dir: string) => {
    for (const file of await readdir(dir)) {
      const s = await readFile(join(dir, file), "utf-8")
      const chunks: ReadonlyArray<WebChunk> = JSON.parse(s)
      const json = chunks.filter(x => x.excerpt.trim().length > 100)
      await writeFile(join(dir, file), JSON.stringify(json, null, 2))
    }
  }

  await clean(CHUNKS_DIR)
})

test(
  "embed",
  async () => {
    await mkdir(EMBEDDINGS_DIR, { recursive: true })

    for (const file of await readdir(CHUNKS_DIR)) {
      const outPath = join(EMBEDDINGS_DIR, file)
      if (await exists(outPath)) continue

      const s = await readFile(join(CHUNKS_DIR, file), "utf-8")
      const chunks: ReadonlyArray<WebChunk> = JSON.parse(s)

      const url = getURL(file)
      const max3k = chunkArray(
        chunks.map(x => x.excerpt),
        2000,
      )

      const acc: Array<WebEmbedding> = []
      for (let i = 0; i < max3k.length; i++) {
        console.log(i, max3k.length)

        const xs = await batched(max3k[i], url)
        acc.push(...xs)

        if (i < max3k.length - 1) {
          /** one min becase 1_000_000 tokens per minute */
          await delay(61_000)
        }
      }
      await writeFile(outPath, JSON.stringify(acc))
    }
  },
  { timeout: 1_000_000 },
)
