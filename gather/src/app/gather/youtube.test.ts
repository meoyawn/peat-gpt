import { readdir, readFile, rm, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { Info, ytDlpInfo, ytDlpPlaylist } from "../../lib/yt-dlp"
import { removeExtension } from "./common"
import inputs from "./inputs.json"

const subtitleURL = (info: Info, lang: "en", ext: "ttml"): string | undefined =>
  info.automatic_captions[lang]?.find(x => x.ext === ext)?.url

const writeSubs = async (videoURL: string, dir: string) => {
  const v = new URL(videoURL).searchParams.get("v")
  if (!v) throw new Error(videoURL)

  if (await exists(join(dir, `${v}.json`))) return

  const i = await ytDlpInfo(videoURL)
  await writeFile(join(dir, `${v}.json`), JSON.stringify(i, null, 2))

  const ext = "ttml"
  const lang = "en"
  const subURL = subtitleURL(i, lang, ext)
  if (!subURL) return

  const res = await fetch(subURL)
  const ttml = await res.text()
  await writeFile(join(dir, `${v}.${lang}.${ext}`), ttml)
}

const downloadYT = async (dir: string): Promise<void> => {
  const { lists, minDurationSeconds } = inputs.youtube

  for (const url of lists) {
    const pl = await ytDlpPlaylist(url)
    for (const e of pl.entries) {
      if (e.duration >= minDurationSeconds) {
        await writeSubs(e.url, dir)
      }
    }
  }
}

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
