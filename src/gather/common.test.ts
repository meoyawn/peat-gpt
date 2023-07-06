import { expect, test } from "vitest"
import { cliText } from "./common"

test("cli", async () => {
  expect(await cliText("true")).toEqual("")
  expect(() => cliText("false")).toThrow(Error("'false' exit code 1"))
})
