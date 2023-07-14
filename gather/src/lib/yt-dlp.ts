import { cliText } from "./node"

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

export const ytDlpInfo = async (url: string): Promise<Info> =>
  JSON.parse(
    await cliText(
      "yt-dlp",
      url,
      "-J",
      "--flat-playlist",
      "--playlist-end",
      "1",
    ),
  ) as Info

export const ytDlpPlaylist = async (url: string): Promise<FlatPlaylist> =>
  JSON.parse(
    await cliText("yt-dlp", url, "-J", "--flat-playlist"),
  ) as FlatPlaylist
