import { readdir, readFile, rm, writeFile } from "fs/promises"
import { join } from "path"
import { expect, test } from "vitest"
import { exists } from "../../lib/node"
import { removeExtension } from "../../lib/path"
import { arrayPromise } from "../../lib/ts"
import { Info, ytDlpInfo, ytDlpPlaylist } from "../../lib/yt-dlp"
import inputs from "./inputs.json"

const subtitleURL = (info: Info, lang: "en", ext: "ttml"): string | undefined =>
  info.automatic_captions[lang]?.find(x => x.ext === ext)?.url

const vid = (videoURL: `https://${string}`): string => {
  const v = new URL(videoURL).searchParams.get("v")
  if (!v) throw new Error(videoURL)
  return v
}

const writeSubs = async (videoURL: HttpURL, dir: string) => {
  const v = vid(videoURL)

  if (await exists(join(dir, `${v}.json`))) return

  const info = await ytDlpInfo(videoURL)
  await writeFile(join(dir, `${v}.json`), JSON.stringify(info, null, 2))

  const ext = "ttml"
  const lang = "en"
  const subURL = subtitleURL(info, lang, ext)
  if (!subURL) return

  const res = await fetch(subURL)
  const ttml = await res.text()
  await writeFile(join(dir, `${v}.${lang}.${ext}`), ttml)
}

const YOUTUBE_DIR = "data/youtube/"

type HttpURL = `https://${string}`

async function* videoURLs(
  listURL: HttpURL,
  minDurationSeconds: number,
): AsyncGenerator<HttpURL> {
  const { entries } = await ytDlpPlaylist(listURL)
  for (const { duration, url } of entries) {
    if (duration >= minDurationSeconds) {
      yield url as HttpURL
    }
  }
}

const convertToArray = async <T>(ag: AsyncGenerator<T>): Promise<Array<T>> => {
  const result: Array<T> = []
  for await (const v of ag) {
    result.push(v)
  }
  return result
}

test(
  "rian stone",
  async () => {
    expect(
      await convertToArray(videoURLs("https://www.youtube.com/@RianStone", 1)),
    ).toHaveLength(1)
  },
  { timeout: 60_000 },
)

async function* youtubeURLs(): AsyncGenerator<HttpURL> {
  const { lists, minDurationSeconds, extra } = inputs.youtube

  for (const url of extra) {
    yield url as HttpURL
  }

  for (const listURL of lists) {
    for await (const videoURL of videoURLs(
      listURL as HttpURL,
      minDurationSeconds,
    )) {
      yield videoURL
    }
  }
}

test.skip(
  "missing URLs",
  async () => {
    const local = await readdir(YOUTUBE_DIR)
    const localVids = local
      .filter(x => x.endsWith(".json"))
      .map(removeExtension)

    const remote = await arrayPromise(youtubeURLs())
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

test.skip("cleanup", async () => {
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
