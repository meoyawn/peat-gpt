import { randomUUID } from "crypto"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { removeExtension } from "../../lib/path"
import { joinEvery, parseTTML } from "../../lib/ttml"
import { mkOpenAI, openAiEmbed } from "../OpenAI"

const CHUNK_MILLIS = /** 4 minutes */ 240_000
const OVERLAP_MILLIS = /** 30 seconds */ 30_000

interface PreparedChunk {
  excerpt: string
  begin: string
  end: string
}

const chunkSubs = async (
  ttmlPath: string,
): Promise<ReadonlyArray<PreparedChunk>> =>
  joinEvery(
    parseTTML(await readFile(ttmlPath, "utf-8")).tt.body.div.p,
    CHUNK_MILLIS,
    OVERLAP_MILLIS,
  ).map(x => ({
    excerpt: x.text,
    begin: x.begin,
    end: x.end,
  }))

test("chunk youtube", async () => {
  const inp = "data/youtube/"

  const out = join(inp, "chunks")
  await mkdir(out, { recursive: true })

  const list = await readdir(inp)
  for (const name of list.filter(x => x.endsWith(".ttml"))) {
    const chunks = await chunkSubs(join(inp, name))
    await writeFile(
      join(out, `${removeExtension(name)}.json`),
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
