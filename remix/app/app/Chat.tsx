import React, { useEffect, useRef, useState, type JSX } from "react"
import { useForm } from "react-hook-form"
import { type Message } from "../../../gather/src/app/bot"
import { md2Html } from "./markdown"

interface Values {
  message: string
}

const TypingSVG = (): JSX.Element => (
  <svg
    width="40"
    height="20"
    viewBox="0 0 40 20"
    className="inline"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle fill="#000" cx="10" cy="10" r="2">
      <animate
        attributeName="opacity"
        values="0;1;0"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
    <circle fill="#000" cx="20" cy="10" r="2">
      <animate
        attributeName="opacity"
        values="0;1;0"
        dur="1s"
        begin="0.2s"
        repeatCount="indefinite"
      />
    </circle>
    <circle fill="#000" cx="30" cy="10" r="2">
      <animate
        attributeName="opacity"
        values="0;1;0"
        dur="1s"
        begin="0.4s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
)

const Msg = ({ assistant, user }: Message) => (
  <>
    <p>
      <b>User: </b>
      <a
        href={`/api/chat?search=${encodeURIComponent(user)}`}
        target="_blank"
        rel="noreferrer"
      >
        {user}
      </a>
    </p>

    {assistant ? (
      <div>
        <hr className="mb-0 mt-0" />
        <div dangerouslySetInnerHTML={{ __html: md2Html(assistant) }} />
        <hr className="mb-0 mt-0" />
      </div>
    ) : (
      <p>
        <hr className="mb-0 mt-0" />
        <b>Ray Peat:</b>
        <TypingSVG />
      </p>
    )}
  </>
)

export const Chat = (): JSX.Element => {
  const [messages, setMessages] = useState<ReadonlyArray<Message>>([])
  const { register, reset, handleSubmit } = useForm<Values>({})

  const chatBottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="mx-auto flex h-screen max-w-5xl flex-col">
      <div className="prose prose-md prose-indigo flex min-w-full flex-grow flex-col overflow-y-scroll">
        <h4 className="sticky top-0 bg-white py-2 text-center">
          Ray Peat bot powered by GPT-3.5
        </h4>

        {messages.map(x => (
          <Msg key={x.id} {...x} />
        ))}
        <div ref={chatBottom} />
      </div>

      <form
        className="flex w-full p-8"
        onSubmit={handleSubmit(async (values, e) => {
          if (!values.message.trim().length) return

          reset()

          const old = messages

          const newMessages: ReadonlyArray<Message> = [
            ...old,
            { id: crypto.randomUUID(), user: values.message },
          ]
          setMessages(newMessages)

          const r = await fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify(newMessages),
          })
          if (r.ok) {
            const last: Message = await r.json()
            setMessages([...old, last])
          } else {
            setMessages(old)
          }
        })}
      >
        <input
          autoFocus
          className="flex-grow rounded-l-md"
          type="text"
          placeholder="ex. Daily aspirin dose"
          {...register("message", { minLength: 1, required: true })}
        />

        <button
          className="rounded-r-md bg-indigo-600 px-3 text-white"
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  )
}
