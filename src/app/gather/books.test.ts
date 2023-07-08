import { test } from "vitest"
import { downloadBooks } from "./books"

test(
  "download",
  async () => {
    await downloadBooks("data/books/")
  },
  { timeout: 1_000_000 },
)
