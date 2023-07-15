import { chunkSentences } from "../../lib/text"
import chunking from "./chunking.json"

export const handleLongParagraph = (s: string): ReadonlyArray<string> => {
  const { chunkLen, overlapLen, maxLen } = chunking.longParagraphs
  return s.length > maxLen ? chunkSentences(s, chunkLen, overlapLen) : [s]
}
