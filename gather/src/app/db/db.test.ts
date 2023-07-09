import { randomUUID } from "crypto"
import { readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { ChatCompletionRequestMessage } from "../../../gen/openai"
import {
  Configuration,
  UpsertVector,
  VectorOperationsApi,
} from "../../../gen/pinecone"
import { batchArray } from "../../lib/ts"
import { openAiChat, openAiEmbed } from "../OpenAI"

const pineconeAPI = new VectorOperationsApi(
  new Configuration({
    basePath: process.env.VITE_PINECONE_BASE,
    apiKey: process.env.VITE_PINECONE_KEY,
  }),
)

interface Embedded {
  id: string
  embedding: Array<number>
  excerpt: string
  pages?: Array<number>

  [k: string]: unknown
}

const DATA_DIR = "data/"

const INIT_PROMPT = `
Your role is to emulate Dr. Ray Peat by answering user queries based on his writings.
With every user question, a corresponding excerpt from Dr. Peat's works will be shared.
Use ONLY the relevant information from the given context to form your response.
If a previous conversation or its relevant context can aid in answering the question, incorporate it.

DO NOT use your own knowledge to answer the question.
Your responses MUST be strictly grounded in the provided context and/or previous conversation.
If the query cannot be answered from context, ask user for clarification or to rephrase the question.

You MUST mention sources for anything you state:
- for books mention title and page number
- for web pages mention URL
- for YouTube mention URL, add "?t=Ns" (take "begin" from context, convert HH:MM:SS.XXX to seconds) query param (e.g., https://www.youtube.com/watch?v=nW3uRVJ24eU&t=378s).
`

const INIT: Readonly<ChatCompletionRequestMessage> = {
  role: "system",
  content: INIT_PROMPT,
}

test(
  "query",
  async () => {
    const query = "how to increase testosterone for men?"

    const question: ChatCompletionRequestMessage = {
      role: "user",
      content: query,
    }
    console.log(question)

    const { data } = await openAiEmbed(query)
    const { matches } = await pineconeAPI.query({
      vector: data[0].embedding,
      topK: 15,
      includeMetadata: true,
    })
    if (!matches?.length) throw new Error("no pinecone matches")
    const ctx = matches.map(x => x.metadata)
    console.log(JSON.stringify(matches, null, 2))
    const context: ChatCompletionRequestMessage = {
      role: "system",
      content: `Relevant info from Ray Peat's work: ${JSON.stringify(ctx)}`,
    }

    console.log(await openAiChat([INIT, question, context]))
  },
  {
    timeout: 1_000_000,
  },
)

test(
  "clean embeddings",
  async () => {
    for (const dir of ["articles", "books", "web", "youtube"]) {
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

test.skip(
  "delete youtube",
  async () => {
    const embeddingsDir = join(DATA_DIR, "youtube", "embeddings")
    for (const file of await readdir(embeddingsDir)) {
      const jsonPath = join(embeddingsDir, file)
      const s = await readFile(jsonPath, "utf-8")
      const arr: ReadonlyArray<Embedded> = JSON.parse(s)
      console.log(await pineconeAPI._delete({ ids: arr.map(x => x.id) }))
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
  "upsert DIRS",
  async () => {
    for (const dir of ["articles"]) {
      const embeddingsDir = join(DATA_DIR, dir, "embeddings")
      for (const file of await readdir(embeddingsDir)) {
        const jsonPath = join(embeddingsDir, file)
        const s = await readFile(jsonPath, "utf-8")
        const arr: ReadonlyArray<Embedded> = JSON.parse(s)

        const full = arr.filter(x => x.excerpt.length > 200).map(toPinecone)
        const batches = batchArray(full, 250)
        console.log(file, batches.length)

        await Promise.all(
          batches.map(vectors => pineconeAPI.upsert({ vectors })),
        )
      }
    }
  },
  {
    timeout: 1_000_000,
  },
)
