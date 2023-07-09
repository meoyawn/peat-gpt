import { XMLParser } from "fast-xml-parser"

type TtmlTS = `${number}:${number}:${number}.${number}`

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
})

export interface TtmlCue {
  /** textNodeName **/
  text: string

  begin: TtmlTS
  end: TtmlTS
  style: string
}

export interface TTML {
  tt: {
    body: {
      div: {
        p: ReadonlyArray<TtmlCue>
      }
    }
  }
}

export const parseTTML = (text: string): TTML => xmlParser.parse(text) as TTML

const ttmlToMillis = (timestamp: TtmlTS): number => {
  const [hours, minutes, secondsAndMillis] = timestamp.split(":")
  const [seconds, millis] = secondsAndMillis.split(".")

  return (
    Number(hours) * 60 * 60 * 1000 +
    Number(minutes) * 60 * 1000 +
    Number(seconds) * 1000 +
    Number(millis)
  )
}

export const joinEvery = (
  cues: ReadonlyArray<Readonly<TtmlCue>>,
  millis: number,
  separator = " ",
): ReadonlyArray<Readonly<TtmlCue>> => {
  const ret = Array<TtmlCue>()
  if (!cues.length) return ret

  let accum: TtmlCue = { ...cues[0] }

  for (let i = 1; i < cues.length; i++) {
    const cue = cues[i]
    if (ttmlToMillis(cue.end) - ttmlToMillis(accum.begin) <= millis) {
      accum.text += separator + cue.text
      accum.end = cue.end
    } else {
      ret.push(accum)
      accum = cues[i]
    }
  }

  ret.push(accum)

  return ret
}
