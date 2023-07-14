import { readdir, readFile, rm, writeFile } from "fs/promises"
import { join } from "path"
import { test } from "vitest"
import { exists } from "../../lib/node"
import { removeExtension } from "../../lib/path"
import { Info, ytDlpInfo, ytDlpPlaylist } from "../../lib/yt-dlp"
import inputs from "./inputs.json"

const subtitleURL = (info: Info, lang: "en", ext: "ttml"): string | undefined =>
  info.automatic_captions[lang]?.find(x => x.ext === ext)?.url

const vid = (videoURL: string): string => {
  const v = new URL(videoURL).searchParams.get("v")
  if (!v) throw new Error(videoURL)
  return v
}

const writeSubs = async (videoURL: string, dir: string) => {
  const v = vid(videoURL)

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

const YOUTUBE_DIR = "data/youtube/"

async function* youtubeURLs(): AsyncGenerator<string, void> {
  const { lists, minDurationSeconds, extra } = inputs.youtube
  for (const url of extra) {
    yield url
  }
  for (const listURL of lists) {
    const { entries } = await ytDlpPlaylist(listURL)
    for (const { duration, url } of entries) {
      if (duration >= minDurationSeconds) {
        yield url
      }
    }
  }
}

async function gen2array<T>(gen: AsyncIterable<T>): Promise<ReadonlyArray<T>> {
  const out = Array<T>(0)
  for await (const x of gen) {
    out.push(x)
  }
  return out
}

test.skip(
  "missing URLs",
  async () => {
    const local = await readdir(YOUTUBE_DIR)
    const localVids = local
      .filter(x => x.endsWith(".json"))
      .map(removeExtension)

    const remote = await gen2array(youtubeURLs())
    const remoteVids = new Set(remote.map(vid))

    console.log(
      JSON.stringify(
        localVids
          .filter(vid => !remoteVids.has(vid))
          .map(vid => `https://www.youtube.com/watch?v=${vid}`),
        null,
        2,
      ),
    )
  },
  {
    timeout: 1_000_000,
  },
)

test(
  "youtube",
  async () => {
    for await (const url of youtubeURLs()) {
      await writeSubs(url, YOUTUBE_DIR)
    }
  },
  { timeout: 1_000_000 },
)

test("cleanup", async () => {
  const names = await readdir(YOUTUBE_DIR)
  for (const name of names) {
    if (!name.endsWith(".json")) continue

    const jsonPath = join(YOUTUBE_DIR, name)
    const jsonStr = await readFile(jsonPath, "utf8")
    const json = JSON.parse(jsonStr)
    const dur = json["duration"]
    if (typeof dur === "number" && dur < inputs.youtube.minDurationSeconds) {
      await rm(jsonPath)
      const ttmlPath = join(YOUTUBE_DIR, `${removeExtension(name)}.en.ttml`)
      await rm(ttmlPath, { force: true })
    }
  }
})
