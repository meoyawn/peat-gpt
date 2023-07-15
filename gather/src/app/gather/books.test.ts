import { writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { tikaText } from "../../lib/tika"
import { filenameWithoutExtension } from "../../lib/path"
import inputs from "./inputs.json"

test(
  "download",
  async () => {
    for (const url of inputs.books) {
      const urr = new URL(url)
      const file = join("data/books/", `${filenameWithoutExtension(urr)}.txt`)
      if (await exists(file)) continue

      await writeFile(file, await tikaText(urr))
    }
  },
  { timeout: 1_000_000 },
)
