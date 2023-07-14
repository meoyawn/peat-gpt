export const splitSentences = (
  text: string,
  maxLen: number,
): ReadonlyArray<string> => {
  if (maxLen < 1) throw new Error("Max length must be at least 1")

  {
    const trimmed = text.trim()
    if (trimmed.length <= maxLen) return [trimmed]
  }

  const ret = Array<string>()
  let acc = ""

  for (const sentence of text.split(/(?<=[.!?])/)) {
    const trimmed = acc.trim()
    if (
      trimmed.length > 0 &&
      trimmed.length + sentence.length > maxLen &&
      !trimmed.endsWith("...")
    ) {
      ret.push(trimmed)
      acc = ""
    }
    acc += sentence
  }

  if (acc.length) {
    ret.push(acc.trim())
  }

  return ret
}

const isLetter = (char: string): boolean =>
  char.toLowerCase() !== char.toUpperCase()

const isUpper = (char: string): boolean =>
  char === char.toUpperCase() && char !== char.toLowerCase()

interface Paragraph {
  text: string
  page?: number
}

export const splitParagraphs = (text: string): ReadonlyArray<Paragraph> => {
  if (!text.trim().length) return []

  const lines = text.split("\n")
  if (!lines.length) return []

  const ret = Array<Paragraph>(0)

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

    if (line.length >= 2) {
      const [one, two] = line
      if (isUpper(one) || (!isLetter(one) && isUpper(two))) {
        ret.push(acc)
        acc = { text: line }
        if (page) {
          acc.page = page + 1
        }
        continue
      }
    }

    acc.text += " " + line
  }

  ret.push(acc)

  return ret
}
