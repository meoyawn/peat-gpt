import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { basename, extname, join } from "path"
import { fromHtml } from "hast-util-from-html"
import { selectAll } from "hast-util-select"
import { toText } from "hast-util-to-text"
import { test } from "vitest"
import { ResponseError } from "../../../../gen/openai"
import { getHref } from "../../lib/html"
import { cliText, exists } from "../../lib/node"
import { filenameWithoutExtension } from "../../lib/path"
import { chunkSentences } from "../../lib/text"
import { mkOpenAI } from "../OpenAI"
import chunking from "../prepare/chunking.json"
import { embedChunks } from "../prepare/embed"
import inputs from "./inputs.json"

async function* fetchMP3s(): AsyncGenerator<readonly [URL, string], void> {
  const { transcripts, selector } = inputs.chadnet
  for (const pageURL of transcripts.urls) {
    const origin = new URL(pageURL)
    const r = await fetch(origin)
    const html = await r.text()

    const arr = selectAll(selector, fromHtml(html))

    const foo = arr.flatMap(x => {
      const href = getHref(origin, x)
      return href.pathname.endsWith(".html") ? [] : [[href, toText(x)] as const]
    })

    for (const audioURL of foo) {
      yield audioURL
    }
  }
}

const AUDIO_DIR = "data/audio/"
const TRANSCRIPTS_DIR = join(AUDIO_DIR, "transcripts")
const DOWNLOADS_DATA_DIR = process.env.VITE_DOWNLOADS_DATA_DIR!

const find = (
  url: URL,
  downloadsFiles: ReadonlyArray<string>,
  localFiles: ReadonlyArray<string>,
): string => {
  const name = filenameWithoutExtension(url)
  const downloaded = downloadsFiles.find(x => x.includes(name))
  const transcribed = localFiles.find(x => x.includes(name))
  if (downloaded) {
    return join(DOWNLOADS_DATA_DIR, downloaded)
  } else if (transcribed) {
    return join(TRANSCRIPTS_DIR, transcribed)
  } else {
    throw new Error(url.toString())
  }
}

interface TranscriptChunk {
  url: URL
  title: string
  excerpt: string
}

test.skip(
  "download audios",
  async () => {
    const downloadsData = await readdir(DOWNLOADS_DATA_DIR)

    const missing = Array<string>(0)
    for await (const [url] of fetchMP3s()) {
      const name = filenameWithoutExtension(url)
      if (!downloadsData.some(x => x.includes(name))) {
        missing.push(url.toString())
      }
    }

    await mkdir(AUDIO_DIR, { recursive: true })
    for (const url of missing) {
      console.log(url)
      await cliText("wget", "-P", AUDIO_DIR, url)
    }
  },
  { timeout: 1_000_000 },
)

const AUDIOFILE_CHUNKS_DIR = join(AUDIO_DIR, "audio-chunks")

test(
  "chunk audio",
  async () => {
    const files = await readdir(AUDIO_DIR)

    for (const file of files) {
      if (!file.endsWith(".mp3")) continue
      const filePath = join(AUDIO_DIR, file)

      // Output directory for the chunks
      const outputDir = join(
        AUDIOFILE_CHUNKS_DIR,
        basename(filePath, extname(filePath)),
      )

      if (await exists(outputDir)) continue

      // ffprobe to get the bitrate
      const probeResult = await cliText(
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=bit_rate",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      )
      const bitRate = Number(probeResult)

      // Calculate max duration (in seconds) for a 25MB chunk
      // Size in bits = size in bytes * 8
      // Duration in seconds = size in bits / bitrate in bits per second
      const maxDuration = Math.round((23 * 1024 * 1024 * 8) / bitRate)

      await mkdir(outputDir, { recursive: true })

      // ffmpeg to split the file
      await cliText(
        "ffmpeg",
        "-i",
        filePath,
        "-f",
        "segment",
        "-segment_time",
        `${maxDuration}`,
        "-c",
        "copy",
        join(outputDir, "%03d.mp3"),
      )
    }
  },
  {
    timeout: 1_000_000,
  },
)

test(
  "transcribe audio chunks",
  async () => {
    const openAIApi = mkOpenAI()

    await mkdir(TRANSCRIPTS_DIR, { recursive: true })

    for (const dir of await readdir(AUDIOFILE_CHUNKS_DIR)) {
      const dirPath = join(AUDIOFILE_CHUNKS_DIR, dir)

      const transcriptPath = join(TRANSCRIPTS_DIR, `${dir}.txt`)
      if (await exists(transcriptPath)) continue

      let acc = ""
      for (const file of await readdir(dirPath)) {
        const filePath = join(dirPath, file)

        console.log(filePath)

        try {
          const { text } = await openAIApi.createTranscription(
            new Blob([await readFile(filePath)]),
            "whisper-1",
            basename(filePath),
          )
          acc += text + "\n"
        } catch (e) {
          if (e instanceof ResponseError) {
            console.error(e.response.status, await e.response.text())
          }
          throw e
        }
      }

      await writeFile(transcriptPath, acc)
    }
  },
  {
    timeout: 1_000_000_000,
  },
)

test("chunk transcripts", async () => {
  const downloadsFiles = await readdir(DOWNLOADS_DATA_DIR)
  const localFiles = await readdir(TRANSCRIPTS_DIR)

  const TRANSCRIPT_CHUNKS_DIR = join(AUDIO_DIR, "chunks")
  await mkdir(TRANSCRIPT_CHUNKS_DIR, { recursive: true })

  const { chunkLen, overlapLen } = chunking.longParagraphs

  for await (const [url, title] of fetchMP3s()) {
    const outPath = join(
      TRANSCRIPT_CHUNKS_DIR,
      `${filenameWithoutExtension(url)}.json`,
    )
    if (await exists(outPath)) continue

    const inPath = find(url, downloadsFiles, localFiles)
    console.log(inPath)

    const text = await readFile(inPath, "utf8")
    const chunks = chunkSentences(text, chunkLen, overlapLen)
      .filter(x => x.length > chunking.minChunkLen)
      .map(excerpt => ({ url, title, excerpt } satisfies TranscriptChunk))

    await writeFile(outPath, JSON.stringify(chunks, null, 2))
  }
})

test("embed transcripts", () => embedChunks(AUDIO_DIR), { timeout: 1_000_000 })
