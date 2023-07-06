import { readdir, readFile, rm } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { removeExtension } from "./common"
import inputs from "./inputs.json"
import { downloadYT } from "./youtube"

const dir = "data/youtube/"

test.skip(
  "youtube",
  async () => {
    await downloadYT("data/youtube/")
  },
  { timeout: 1_000_000 },
)

test("cleanup", async () => {
  const names = await readdir(dir)
  for (const name of names) {
    if (!name.endsWith(".json")) continue

    const jsonPath = join(dir, name)
    const jsonStr = await readFile(jsonPath, "utf8")
    const json = JSON.parse(jsonStr)
    const dur = json["duration"]
    if (typeof dur === "number" && dur < inputs.youtube.minDurationSeconds) {
      await rm(jsonPath)
      const ttmlPath = join(dir, `${removeExtension(name)}.en.ttml`)
      await rm(ttmlPath, { force: true })
    }
  }
})
