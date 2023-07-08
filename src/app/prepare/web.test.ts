import { test } from "vitest"
import { join } from "path"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { openAiEmbed } from "./embed"
import { exists } from "../../lib/node"
import { ResponseError } from "../../../gen/openai"

const CHUNKS_DIR = "data/web/chunks/"
const EMBEDDINGS_DIR = "data/web/embeddings/"

interface WebChunk {
  excerpt: string
}

interface WebEmbedding extends WebChunk {
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
    .map(excerpt => ({ excerpt }) satisfies WebChunk)
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

const batched = async (
  input: ReadonlyArray<string>,
  url: string,
): Promise<ReadonlyArray<WebEmbedding>> => {
  try {
    const { data } = await openAiEmbed(input)
    return data.map(({ embedding }, i) => ({
      excerpt: input[i],
      url,
      embedding,
    }))
  } catch (e) {
    if (e instanceof ResponseError) {
      console.log(input)
      console.error(await e.response.text())
    }
    throw e
  }
}

const lineByLine = async (
  input: Array<string>,
  url: string,
): Promise<ReadonlyArray<WebEmbedding>> => {
  const ret: Array<WebEmbedding> = []
  for (let i = 0; i < input.length; i++) {
    console.log(i, input.length)

    const excerpt = input[i]

    try {
      const { data } = await openAiEmbed(excerpt)
      ret.push({
        excerpt,
        url,
        embedding: data[0].embedding,
      })
    } catch (e) {
      if (e instanceof ResponseError) {
        console.log(excerpt)
        console.error(await e.response.text())
      }
      throw e
    }
  }
  return ret
}

const delay = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

const splitArray = <T>(
  arr: ReadonlyArray<T>,
  len: number,
): ReadonlyArray<ReadonlyArray<T>> => {
  const ret: Array<ReadonlyArray<T>> = []
  for (let i = 0; i < arr.length; i += len) {
    ret.push(arr.slice(i, i + len))
  }
  return ret
}

test.skip("sanitize chunks", async () => {
  const clean = async (dir: string) => {
    for (const file of await readdir(dir)) {
      const s = await readFile(join(dir, file), "utf-8")
      const chunks: ReadonlyArray<WebChunk> = JSON.parse(s)
      const json = chunks.filter(x => x.excerpt.trim().length)
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
      const max3k = splitArray(
        chunks.map(x => x.excerpt),
        2500,
      )

      const acc: Array<WebEmbedding> = []
      for (let i = 0; i < max3k.length; i++) {
        console.log(i, max3k.length)

        const xs = await batched(max3k[i], url)
        acc.push(...xs)

        if (i !== max3k.length - 1) {
          /** one min */
          await delay(61_000)
        }
      }
      await writeFile(outPath, JSON.stringify(acc))
    }
  },
  { timeout: 1_000_000 },
)
