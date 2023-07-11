import { type V2_MetaFunction } from "@remix-run/cloudflare"
import { type JSX } from "react"
import { Chat } from "../app/Chat"

export const meta: V2_MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ]
}

export default function Index(): JSX.Element {
  return (
    <div>
      <Chat />
    </div>
  )
}
