import { exists, writeFile } from "fs/promises"
import { join } from "path"
import { ytDlpInfo, ytDlpPlaylist, type Info } from "../lib/yt-dlp"
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

export const downloadYT = async (dir: string) => {
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
