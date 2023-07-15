import { randomUUID } from "crypto"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { exists } from "../../lib/node"
import { removeExtension } from "../../lib/path"
import { mkOpenAI, openAiEmbed } from "../OpenAI"

interface Chunk extends Record<string, unknown> {
  excerpt: string
}

interface EmbeddedChunk extends Chunk {
  id: string
  embedding: ReadonlyArray<number>
}

const api = mkOpenAI()

export const embedChunks = async (dir: string): Promise<void> => {
  const inp = join(dir, "chunks")
  const outDir = join(dir, "embeddings")
  await mkdir(outDir, { recursive: true })

  for (const file of await readdir(inp)) {
    const outPath = join(outDir, file)
    if (await exists(outPath)) continue

    const text = await readFile(join(inp, file), "utf-8")
    const chunks = JSON.parse(text) as ReadonlyArray<Chunk>

    // eslint-disable-next-line no-console
    console.log(removeExtension(file), chunks.length)
    const { data } = await openAiEmbed(
      api,
      chunks.map(x => x.excerpt),
    )

    const out = data.map(
      ({ embedding }, i) =>
        ({
          ...chunks[i],
          embedding,
          id: randomUUID(),
        } satisfies EmbeddedChunk),
    )
    await writeFile(outPath, JSON.stringify(out))
  }
}
