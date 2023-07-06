import { Configuration, OpenAIApi } from "../../gen/openai"

export const EMBEDDING_MODEL = "text-embedding-ada-002"

export const openAiApi = new OpenAIApi(
  new Configuration({
    headers: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      Authorization: `Bearer ${process.env.VITE_OPENAPI_KEY}`,
    },
  }),
)
