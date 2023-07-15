import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { joinEvery, parseTTML } from "../../lib/ttml"
import { Info } from "../../lib/yt-dlp"
import chunking from "./chunking.json"
import { embedChunks } from "./embed"

interface Chunk {
  title: string
  begin: string
  end: string
  excerpt: string
  url: string
}

const chunkSubs = async (
  ttmlPath: string,
  title: string,
  url: string,
): Promise<ReadonlyArray<Chunk>> => {
  const { overlapMillis, chunkLenMillis } = chunking.youtube
  const text = await readFile(ttmlPath, "utf-8")
  return joinEvery(parseTTML(text).tt.body.div.p, chunkLenMillis, overlapMillis)
    .filter(x => x.text.length > chunking.minChunkLen)
    .map(x => ({
      excerpt: x.text,
      begin: x.begin,
      end: x.end,
      title,
      url,
    }))
}

const YOUTUBE_DIR = "data/youtube/"

test("chunk youtube", async () => {
  const chunksDir = join(YOUTUBE_DIR, "chunks")
  await mkdir(chunksDir, { recursive: true })

  const list = await readdir(YOUTUBE_DIR)
  for (const ttmlFile of list.filter(x => x.endsWith(".ttml"))) {
    const [vid] = ttmlFile.split(".")
    const outPath = join(chunksDir, `${vid}.json`)
    if (await exists(outPath)) return

    const infoJSON = await readFile(join(YOUTUBE_DIR, `${vid}.json`), "utf-8")
    const { title, webpage_url } = JSON.parse(infoJSON) as Info

    const chunks = await chunkSubs(
      join(YOUTUBE_DIR, ttmlFile),
      title,
      webpage_url,
    )
    await writeFile(outPath, JSON.stringify(chunks, null, 2))
  }
})

test("embed youtube", () => embedChunks(YOUTUBE_DIR), { timeout: 1_000_000 })
