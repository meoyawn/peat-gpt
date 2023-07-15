import { randomUUID } from "crypto"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { removeExtension } from "../../lib/path"
import { joinEvery, parseTTML } from "../../lib/ttml"
import { mkOpenAI, openAiEmbed } from "../OpenAI"
import chunking from "./chunking.json"

interface PreparedChunk {
  excerpt: string
  begin: string
  end: string
}

const chunkSubs = async (
  ttmlPath: string,
): Promise<ReadonlyArray<PreparedChunk>> => {
  const text = await readFile(ttmlPath, "utf-8")
  const { overlapMillis, chunkLenMillis } = chunking.youtube
  return joinEvery(parseTTML(text).tt.body.div.p, chunkLenMillis, overlapMillis)
    .filter(x => x.text.length > chunking.minChunkLen)
    .map(x => ({
      excerpt: x.text,
      begin: x.begin,
      end: x.end,
    }))
}

const YOUTUBE_DIR = "data/youtube/"

test("chunk youtube", async () => {
  const out = join(YOUTUBE_DIR, "chunks")
  await mkdir(out, { recursive: true })

  const list = await readdir(YOUTUBE_DIR)
  for (const ttmlFile of list.filter(x => x.endsWith(".ttml"))) {
    const chunks = await chunkSubs(join(YOUTUBE_DIR, ttmlFile))
    await writeFile(
      join(out, `${removeExtension(ttmlFile)}.json`),
      JSON.stringify(chunks, null, 2),
    )
  }
})

interface EmbeddedChunk extends PreparedChunk {
  id: string
  embedding: ReadonlyArray<number>
  url: string
}

const api = mkOpenAI()

test(
  "embed youtube",
  async () => {
    const inp = "data/youtube/chunks/"
    const outDir = "data/youtube/embeddings/"
    await mkdir(outDir, { recursive: true })

    for (const file of await readdir(inp)) {
      const outPath = join(outDir, file)
      if (await exists(outPath)) continue

      const [vid] = file.split(".")
      const text = await readFile(join(inp, file), "utf-8")
      const chunks: ReadonlyArray<PreparedChunk> = JSON.parse(text)

      console.log(vid, chunks.length)
      const { data } = await openAiEmbed(
        api,
        chunks.map(x => x.excerpt),
      )

      const arr = data.map(
        ({ embedding }, i) =>
          ({
            ...chunks[i],
            embedding,
            url: `https://www.youtube.com/watch?v=${vid}`,
            id: randomUUID(),
          } satisfies EmbeddedChunk),
      )
      await writeFile(outPath, JSON.stringify(arr))
    }
  },
  {
    timeout: 1_000_000,
  },
)
