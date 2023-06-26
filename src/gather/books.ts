import { exists, writeFile } from "fs/promises"
import { join } from "path"
import { filenameWithoutExtension, tikaText } from "./common"
import inputs from "./inputs.json"

export const downloadBooks = async (dir: string): Promise<void> => {
  for (const url of inputs.books) {
    const file = join(dir, `${filenameWithoutExtension(new URL(url))}.txt`)
    if (await exists(file)) continue

    await writeFile(file, await tikaText(url))
  }
}
