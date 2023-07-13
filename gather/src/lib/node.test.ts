import { expect, test } from "vitest"
import { cliText } from "./node"

test("cli", async () => {
  expect(await cliText("true")).toEqual("")
  await cliText("false").catch(e =>
    expect(e).toEqual({ cmd: "false", code: 1, error: "" }),
  )
})
