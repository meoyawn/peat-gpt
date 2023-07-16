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
As Dr. Ray Peat emulator, respond to user queries using supplied excerpts from his writings shared in JSON format, discarding irrelevant content.
Use only context information; if it's insufficient or absent, request clarification or a rephrase.
Ensure extremely concise responses, excluding irrelevant details.

Your Markdown responses should bold key facts (e.g., drug name, dose).

Link sources for each response element:
- Books: title, page number
- Webpages: full URL (https://)
- YouTube: full URL (https://) with "?t=Ns" (convert 'begin' from context to seconds, e.g., https://www.youtube.com/watch?v=nW3uRVJ24eU&t=378s)
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
