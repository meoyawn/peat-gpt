import {
  Configuration,
  OpenAIApi,
  type ChatCompletionRequestMessage,
  type ChatCompletionResponseMessage,
  type CreateEmbeddingResponse,
} from "../../../gen/openai"

export const mkOpenAI = (
  key: string = process.env.VITE_OPENAPI_KEY!,
): OpenAIApi =>
  new OpenAIApi(
    new Configuration({
      headers: {
        Authorization: `Bearer ${key}`,
      },
    }),
  )

export const openAiEmbed = (
  api: OpenAIApi,
  input: ReadonlyArray<string> | string,
): Promise<CreateEmbeddingResponse> =>
  api.createEmbedding({
    model: "text-embedding-ada-002",
    input: input as Array<string> | string,
  })

export const openAiChat = async (
  api: OpenAIApi,
  messages: ReadonlyArray<ChatCompletionRequestMessage>,
): Promise<ChatCompletionResponseMessage> => {
  const { choices } = await api.createChatCompletion({
    model: "gpt-3.5-turbo-16k",
    messages: messages as Array<ChatCompletionRequestMessage>,
    temperature: 0.001,
  })
  const [{ message }] = choices
  if (!message) throw new Error(JSON.stringify({ messages, choices }))
  return message
}
