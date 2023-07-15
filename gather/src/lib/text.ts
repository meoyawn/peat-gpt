const isLetter = (char: string): boolean =>
  char.toLowerCase() !== char.toUpperCase()

const isUpper = (char: string): boolean =>
  char === char.toUpperCase() && char !== char.toLowerCase()

const isSentenceStart = (line: string): boolean => {
  const trimmed = line.trim()
  if (trimmed.length < 2) return false

  const [one, two] = trimmed
  return isUpper(one) || (!isLetter(one) && isUpper(two))
}

export const chunkSentences = (
  text: string,
  chunkLen: number,
  overlapLen: number = 0,
): ReadonlyArray<string> => {
  if (chunkLen < 1) throw new Error("chunkLen must be at least 1")
  if (overlapLen < 0) throw new Error("overlapLen must be at least 0")

  {
    const trimmed = text.trim()
    if (trimmed.length <= chunkLen) return [trimmed]
  }

  const out = Array<string>(0)
  let acc = ""
  let overlap = ""

  for (const sentenceLike of text.split(/(?<=[.!?])/)) {
    /** preventing something like splitting on "3.14". It doesn't prevent "Mr. Smith" however */
    const newSentence = isSentenceStart(sentenceLike)
    if (newSentence) {
      const trimmed = acc.trim()
      if (
        trimmed.length > 0 &&
        trimmed.length + sentenceLike.length > chunkLen &&
        !trimmed.endsWith("...")
      ) {
        out.push(trimmed)
        acc = overlap
        overlap = ""
      }
    }

    acc += sentenceLike
    if (
      overlapLen > 0 &&
      chunkLen - acc.length < overlapLen &&
      (newSentence || overlap.length)
    ) {
      overlap += sentenceLike
    }
  }

  if (acc.length) {
    out.push(acc.trim())
  }

  return out
}

interface Paragraph {
  text: string
  page?: number
}

export const splitParagraphs = (text: string): ReadonlyArray<Paragraph> => {
  if (!text.trim().length) return []

  const lines = text.split("\n")
  if (!lines.length) return []

  const out = Array<Paragraph>(0)

  let acc: Paragraph = { text: lines[0] }
  let page: number | undefined

  /** NOTE it starts from 1 */
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()

    const num = Number(line)
    if (num > 0 && (!page || num > page)) {
      page = num
      continue
    }

    if (isSentenceStart(line)) {
      out.push(acc)
      acc = { text: line }
      if (page) {
        acc.page = page + 1
      }
      continue
    }

    acc.text += " " + line
  }

  out.push(acc)

  return out
}
