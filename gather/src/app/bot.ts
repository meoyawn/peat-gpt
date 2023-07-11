import {
  type ChatCompletionRequestMessage,
  type OpenAIApi,
} from "../../../gen/openai"
import {
  type QueryMatch,
  type VectorOperationsApi,
} from "../../../gen/pinecone"
import { openAiChat, openAiEmbed } from "./OpenAI"

const INIT_PROMPT = `
Your role is to emulate Dr. Ray Peat by answering user queries based on his writings.

With every user question, a corresponding excerpt from Dr. Peat's works will be shared as a JSON array.
Not everything in it will be relevant.

You don't use your own knowledge or opinion, only relevant information from current or previous context to form your response.
If the query cannot be answered from current or previous context, you ask the user for clarification or to rephrase the question.
Your answers are extremely concise.
You DO NOT include information from context that's not directly relevant to user's question.
You DO NOT state anything that's not directly relevant to user's question.

Your responses are in Markdown. You highlight critical facts (e.g. drug name, dose, etc) in **bold**.

You link sources (from context) for each paragraph or bullet point or list item you write (and not more):
- for books: title and page number
- for web pages: full URL with https://
- for YouTube: full URL with https:// with "?t=Ns" (take "begin" from context, convert HH:MM:SS.XXX to seconds) query param (e.g., https://www.youtube.com/watch?v=nW3uRVJ24eU&t=378s)

Any statement without a source is considered your own opinion and you will be punished for it.
`

const INIT: Readonly<ChatCompletionRequestMessage> = {
  role: "system",
  content: INIT_PROMPT,
}

export interface Message {
  readonly id: string
  readonly user: string
  readonly system?: string
  readonly assistant?: string
}

const toOpenAI = (
  ms: ReadonlyArray<Message>,
): ReadonlyArray<ChatCompletionRequestMessage> =>
  ms.flatMap(({ assistant, system, user }) => {
    const ret: Array<ChatCompletionRequestMessage> = [
      { role: "user", content: user },
    ]
    if (system) {
      ret.push({ role: "system", content: system })
    }
    if (assistant) {
      ret.push({ role: "assistant", content: assistant })
    }
    return ret
  })

export class AiMemory {
  constructor(
    private readonly openAI: OpenAIApi,
    private readonly pinecone: VectorOperationsApi,
  ) {}

  async getMatches(
    query: string,
    topK: number = 10,
    minScore: number = 0.81,
  ): Promise<ReadonlyArray<QueryMatch>> {
    const { data } = await openAiEmbed(this.openAI, query)
    const { matches } = await this.pinecone.query({
      vector: data[0].embedding,
      topK,
      includeMetadata: true,
    })
    return matches?.filter(({ score }) => score && score >= minScore) ?? []
  }

  private async systemMsg(
    query: string,
  ): Promise<ChatCompletionRequestMessage> {
    const matches = await this.getMatches(query)
    return {
      role: "system",
      content: JSON.stringify(matches.map(x => x.metadata)),
    }
  }

  async nextMessage(ms: ReadonlyArray<Message>): Promise<Message> {
    if (!ms.length) throw new Error(JSON.stringify(ms))
    const last = ms[ms.length - 1]

    const system = await this.systemMsg(last.user)
    const assistant = await openAiChat(this.openAI, [
      INIT,
      ...toOpenAI(ms),
      system,
    ])

    return {
      ...last,
      system: system.content!,
      assistant: assistant.content!,
    }
  }
}
