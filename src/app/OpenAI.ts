import {
  Configuration,
  OpenAIApi,
  type ChatCompletionRequestMessage,
  type ChatCompletionResponseMessage,
  type CreateEmbeddingResponse,
} from "../../gen/openai"

const openAiApi = new OpenAIApi(
  new Configuration({
    headers: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      Authorization: `Bearer ${process.env.VITE_OPENAPI_KEY}`,
    },
  }),
)

export const openAiEmbed = (
  input: ReadonlyArray<string> | string,
): Promise<CreateEmbeddingResponse> =>
  openAiApi.createEmbedding({
    model: "text-embedding-ada-002",
    input: input as Array<string> | string,
  })

export const openAiChat = async (
  messages: ReadonlyArray<
    ChatCompletionRequestMessage | ChatCompletionResponseMessage
  >,
): Promise<ChatCompletionResponseMessage> => {
  const { choices } = await openAiApi.createChatCompletion({
    model: "gpt-3.5-turbo-16k",
    messages: messages as Array<ChatCompletionRequestMessage>,
    temperature: 0.05,
  })
  const [{ message }] = choices
  if (!message) throw new Error(JSON.stringify({ messages, choices }))
  return message
}
