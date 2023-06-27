import { cliText } from "../gather/common"

interface Caption {
  ext: string
  url: string
  name: string
}

interface YtDL {
  id: string
  title: string
  webpage_url: string
  description: string
}

export interface Info extends YtDL {
  automatic_captions: Partial<Record<string, ReadonlyArray<Caption>>>
}

interface Entry {
  url: string

  /** seconds */
  duration: number
}

interface FlatPlaylist extends YtDL {
  entries: ReadonlyArray<Entry>
}

export async function ytDlpInfo(url: string): Promise<Info> {
  const s = await cliText(
    "yt-dlp",
    url,
    "-J",
    "--flat-playlist",
    "--playlist-end",
    "1",
  )
  return JSON.parse(s) as Info
}

export async function ytDlpPlaylist(url: string): Promise<FlatPlaylist> {
  const s = await cliText("yt-dlp", url, "-J", "--flat-playlist")
  return JSON.parse(s) as FlatPlaylist
}
