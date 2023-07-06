import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { removeExtension } from "../gather/common"
import { exists } from "../lib/node"
import { joinEvery, parseTTML } from "../lib/ttml"
import { EMBEDDING_MODEL, openAiApi } from "./embed"

const ONE_MINUTE_MILLIS = 60_000

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
    ONE_MINUTE_MILLIS,
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
  embedding: ReadonlyArray<number>
  url: string
}

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

      const res = await openAiApi.createEmbedding({
        model: EMBEDDING_MODEL,
        input: chunks.map(x => x.excerpt),
      })

      const arr = res.data.map(
        ({ embedding }, i) =>
          ({
            ...chunks[i],
            embedding,
            url: `https://www.youtube.com/watch?v=${vid}`,
          } satisfies EmbeddedChunk),
      )
      await writeFile(outPath, JSON.stringify(arr))
    }
  },
  {
    timeout: 1_000_000,
  },
)
