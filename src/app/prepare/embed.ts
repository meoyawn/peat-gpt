import {
  Configuration,
  type CreateEmbeddingResponse,
  OpenAIApi,
} from "../../../gen/openai"

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
