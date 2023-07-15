export const splitWords = (
  text: string,
  chunkLen: number,
  overlapLen: number = 0,
): ReadonlyArray<string> => {
  if (text.length === 0) return []
  if (isNaN(chunkLen) || chunkLen < 1) throw new Error(`chunkLen ${chunkLen}`)
  if (isNaN(overlapLen) || overlapLen < 0) {
    throw new Error(`overlapLen ${overlapLen}`)
  }
  const lines = text.split("\n")
  if (lines.length > 2) throw new Error(`lines ${lines.length}`)

  const words = text.split(/\s+/)
  const out = Array<string>(0)

  let acc = ""
  let overlap = ""

  for (const word of words) {
    const trimmed = acc.trim()
    const futureLen = trimmed.length + word.length

    if (trimmed.length > 0 && futureLen > chunkLen) {
      out.push(trimmed)
      acc = overlap
      overlap = ""
    }

    acc += word + " "
    if (overlapLen > 0 && chunkLen - futureLen < overlapLen) {
      overlap += word + " "
    }
  }

  if (acc.length) {
    out.push(acc.trim())
  }

  return out
}

export const splitSentences = (
  text: string,
  chunkLen: number,
  overlapLen: number = 0,
): ReadonlyArray<string> => {
  if (chunkLen < 1) throw new Error("Max length must be at least 1")

  {
    const trimmed = text.trim()
    if (trimmed.length <= chunkLen) return [trimmed]
  }

  const out = Array<string>(0)
  const sentences = text.split(/(?<=[.!?])/)
  if (!sentences.length) return out

  let acc = ""
  let overlap = ""

  for (const sentence of sentences) {
    if (startsSentence(sentence)) {
      const trimmed = acc.trim()
      if (
        trimmed.length > 0 &&
        trimmed.length + sentence.length > chunkLen &&
        !trimmed.endsWith("...")
      ) {
        out.push(trimmed)
        acc = overlap
        overlap = ""
      }
    }

    acc += sentence
    if (overlapLen > 0 && chunkLen - acc.length < overlapLen) {
      overlap += sentence
    }
  }

  if (acc.length) {
    out.push(acc.trim())
  }

  return out
}

const isLetter = (char: string): boolean =>
  char.toLowerCase() !== char.toUpperCase()

const isUpper = (char: string): boolean =>
  char === char.toUpperCase() && char !== char.toLowerCase()

interface Paragraph {
  text: string
  page?: number
}

const startsSentence = (line: string): boolean => {
  const trimmed = line.trim()
  if (trimmed.length < 2) return false

  const [one, two] = trimmed
  return isUpper(one) || (!isLetter(one) && isUpper(two))
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

    if (startsSentence(line)) {
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
