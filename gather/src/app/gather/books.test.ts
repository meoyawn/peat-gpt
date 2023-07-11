import { writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { tikaText } from "../../lib/tika"
import { filenameWithoutExtension } from "./common"
import inputs from "./inputs.json"

test(
  "download",
  async () => {
    for (const url of inputs.books) {
      const file = join(
        "data/books/",
        `${filenameWithoutExtension(new URL(url))}.txt`,
      )
      if (await exists(file)) continue

      await writeFile(file, await tikaText(url))
    }
  },
  { timeout: 1_000_000 },
)
