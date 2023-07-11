import type {
  ActionArgs,
  AppLoadContext,
  LoaderArgs,
  TypedResponse,
} from "@remix-run/cloudflare"
import { json } from "@remix-run/cloudflare"
import { AiMemory, type Message } from "PeatGTP-gather/src/app/bot"
import { mkOpenAI } from "../../../gather/src/app/OpenAI"
import { mkPinecone } from "../../../gather/src/app/pinecone"

const getMemory = (context: AppLoadContext): AiMemory => {
  const env = context.env as Record<string, string>
  return new AiMemory(
    mkOpenAI(env.VITE_OPENAPI_KEY),
    mkPinecone(env.VITE_PINECONE_BASE, env.VITE_PINECONE_KEY),
  )
}

export const loader = async ({
  context,
  request,
}: LoaderArgs): Promise<TypedResponse<unknown>> => {
  const search = new URL(request.url).searchParams.get("search")
  if (!search) return json({}, { status: 400 })
  return json(await getMemory(context).getMatches(search))
}

export const action = async ({
  context,
  request,
}: ActionArgs): Promise<TypedResponse<Message>> =>
  json(await getMemory(context).nextMessage(await request.json()))
