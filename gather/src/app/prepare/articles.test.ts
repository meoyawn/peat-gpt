import { randomUUID } from "crypto"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { expect, test } from "vitest"
import { exists } from "../../lib/node"
import { removeExtension } from "../gather/common"
import { openAiEmbed } from "../OpenAI"

interface Chunk {
  excerpt: string
  url: string
}

const MAX_CHUNK_LEN = 32_000

const splitOnSentenceMaxLen = (
  text: string,
  maxLen: number,
): ReadonlyArray<string> => {
  if (maxLen < 1) throw new Error("Max length must be at least 1")

  {
    const trimmed = text.trim()
    if (maxLen > trimmed.length) return [trimmed]
  }

  const ret = Array<string>()
  let acc = ""

  for (const sentence of text.split(/(?<=[.!?])/)) {
    const trimmed = acc.trim()
    if (trimmed.length > 0 && trimmed.length + sentence.length > maxLen) {
      ret.push(trimmed)
      acc = ""
    }
    acc += sentence
  }

  if (acc.length) {
    ret.push(acc.trim())
  }

  return ret
}

test("split on sentence max len", () => {
  expect(splitOnSentenceMaxLen("hello. world", 10)).toEqual(["hello.", "world"])
  expect(splitOnSentenceMaxLen("hello. world", 20)).toEqual(["hello. world"])
  expect(() => splitOnSentenceMaxLen("hello. world", 0)).toThrow()
  expect(splitOnSentenceMaxLen("hello. world", 1)).toEqual(["hello.", "world"])
  expect(splitOnSentenceMaxLen("hello? world", 1)).toEqual(["hello?", "world"])
  expect(splitOnSentenceMaxLen("hello!", 1)).toEqual(["hello!"])

  // test with longer and complex text
  expect(
    splitOnSentenceMaxLen("This is a test. I love programming. Do you?", 25),
  ).toEqual(["This is a test.", "I love programming.", "Do you?"])

  // test with no sentence terminators
  expect(
    splitOnSentenceMaxLen("This is a test I love programming Do you", 25),
  ).toEqual(["This is a test I love programming Do you"])

  // test with all sentence terminators and no words
  expect(splitOnSentenceMaxLen("...!?!", 3)).toEqual(["...", "!?!"])

  // test with empty string
  expect(splitOnSentenceMaxLen("", 1)).toEqual([""])

  // test with maxLen larger than the string length
  expect(splitOnSentenceMaxLen("Hello world!", 50)).toEqual(["Hello world!"])

  // test with sentence longer than maxLen
  expect(
    splitOnSentenceMaxLen(
      "This is a really long sentence that exceeds the max length.",
      10,
    ),
  ).toEqual(["This is a really long sentence that exceeds the max length."])
})

test("chunk articles", async () => {
  const inp = "data/articles/"
  const fixedDir = "data/articles/fixed/"
  const chunksDir = "data/articles/chunks/"
  await mkdir(chunksDir, { recursive: true })

  const list = (await readdir(inp)).filter(x => x.endsWith(".txt"))
  for (const name of list) {
    const fixedPath = join(fixedDir, name)
    const e = await exists(fixedPath)
    const path = e ? fixedPath : join(inp, name)
    const slug = removeExtension(name)
    const url = `https://raypeat.com/articles/articles/${slug}.shtml`
    const outFile = join(chunksDir, `${slug}.json`)
    if (await exists(outFile)) continue

    const text = await readFile(path, "utf-8")

    const obj = text
      .split("\n")
      .flatMap(x => splitOnSentenceMaxLen(x, MAX_CHUNK_LEN))
      .filter(x => x.length)
      .map(x => {
        expect(x.length).toBeLessThanOrEqual(MAX_CHUNK_LEN)
        return { excerpt: x, url } satisfies Chunk
      })

    await writeFile(outFile, JSON.stringify(obj, null, 2))
  }
})

interface EmbeddedChunk extends Chunk {
  id: string
  embedding: ReadonlyArray<number>
}

test(
  "embed articles",
  async () => {
    const chunksDir = "data/articles/chunks/"
    const outDir = "data/articles/embeddings/"
    await mkdir(outDir, { recursive: true })

    for (const file of await readdir(chunksDir)) {
      const outPath = join(outDir, file)
      if (await exists(outPath)) continue

      const inPath = join(chunksDir, file)
      const text = await readFile(inPath, "utf-8")
      const chunks: ReadonlyArray<Chunk> = JSON.parse(text)
      console.log(inPath, chunks.length)

      const { data } = await openAiEmbed(chunks.map(({ excerpt }) => excerpt))
      const arr = data.map(
        ({ embedding }, i) =>
          ({
            ...chunks[i],
            embedding,
            id: randomUUID(),
          } satisfies EmbeddedChunk),
      )
      await writeFile(outPath, JSON.stringify(arr))
    }
  },
  { timeout: 1_000_000 },
)

const clean = async (dir: string) => {
  for (const file of await readdir(dir)) {
    const s = await readFile(join(dir, file), "utf-8")
    const chunks: ReadonlyArray<Chunk> = JSON.parse(s)
    const json = chunks.filter(x => x.excerpt.trim().length)
    await writeFile(join(dir, file), JSON.stringify(json, null, 2))
  }
}

test.skip("clean", async () => {
  await clean("data/articles/chunks/")
  await clean("data/articles/embeddings/")
})
