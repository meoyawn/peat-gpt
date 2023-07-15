import { XMLParser } from "fast-xml-parser"

type TtmlTS = `${number}:${number}:${number}.${number}`

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
})

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

const append = (
  accum: TtmlCue,
  cue: Readonly<TtmlCue>,
  separator: string,
): void => {
  accum.text += separator + cue.text
  accum.end = cue.end
}

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

export interface TtmlCue {
  /** textNodeName **/
  text: string

  begin: TtmlTS
  end: TtmlTS
  style: string
}

export const joinEvery = (
  cues: ReadonlyArray<Readonly<TtmlCue>>,
  durationMillis: number,
  overlapMillis: number,
  separator = " ",
): ReadonlyArray<Readonly<TtmlCue>> => {
  const out = Array<TtmlCue>(0)
  if (!cues.length) return out

  let accum: TtmlCue = { ...cues[0] }
  let overlap: TtmlCue | undefined

  /** NOTE it starts at 1 */
  for (let i = 1; i < cues.length; i++) {
    const cue = cues[i]

    const gap = ttmlToMillis(cue.end) - ttmlToMillis(accum.begin)
    if (gap <= durationMillis) {
      // accum
      append(accum, cue, separator)

      if (durationMillis - gap < overlapMillis) {
        if (overlap) {
          append(overlap, cue, separator)
        } else {
          overlap = { ...cue }
        }
      }
    } else {
      // flush
      out.push(accum)

      if (overlap) {
        accum = { ...overlap }
        append(accum, cue, separator)
        overlap = undefined
      } else {
        accum = { ...cue }
      }
    }
  }

  out.push(accum)

  return out
}
