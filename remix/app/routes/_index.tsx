import { type V2_MetaFunction } from "@remix-run/cloudflare"
import { type JSX } from "react"
import { Chat } from "../app/Chat"

export const meta: V2_MetaFunction = () => [
  { title: "Ray Peat Bot" },
  { name: "description", content: "Ray Peat Bot powered by GPT-3.5" },
]

export default function Index(): JSX.Element {
  return (
    <div>
      <Chat />
    </div>
  )
}
