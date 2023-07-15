import { describe, expect, test } from "vitest"
import { splitParagraphs, chunkSentences, chunkWords } from "./text"

describe("splitSentences", () => {
  test("quoted sentence", () => {
    expect(
      chunkSentences(`He saw her. "She's hot." That was his first thought.`, 5),
    ).toEqual(["He saw her.", `"She's hot." That was his first thought.`])
  })

  test("split on sentence max len", () => {
    expect(chunkSentences("Hello. World", 5)).toEqual(["Hello.", "World"])
    expect(chunkSentences("Hello. World", 10)).toEqual(["Hello.", "World"])
    expect(chunkSentences("Hello. World", 20)).toEqual(["Hello. World"])
    expect(() => chunkSentences("Hello. World", 0)).toThrow()
    expect(chunkSentences("Hello. World", 1)).toEqual(["Hello.", "World"])
    expect(chunkSentences("Hello? World", 1)).toEqual(["Hello?", "World"])
    expect(chunkSentences("Hello!", 1)).toEqual(["Hello!"])

    // test with longer and complex text
    expect(
      chunkSentences("This is a test. I love programming. Do you?", 25),
    ).toEqual(["This is a test.", "I love programming.", "Do you?"])

    // test with no sentence terminators
    expect(
      chunkSentences("This is a test I love programming Do you", 25),
    ).toEqual(["This is a test I love programming Do you"])

    // test with all sentence terminators and no words
    expect(chunkSentences("...!?!", 3)).toEqual(["...!?!"])

    // test with empty string
    expect(chunkSentences("", 1)).toEqual([""])

    // test with maxLen larger than the string length
    expect(chunkSentences("Hello world!", 50)).toEqual(["Hello world!"])

    // test with sentence longer than maxLen
    expect(
      chunkSentences(
        "This is a really long sentence that exceeds the max length.",
        10,
      ),
    ).toEqual(["This is a really long sentence that exceeds the max length."])
  })

  test("simple overlap", () => {
    expect(chunkSentences("One. Two. Three.", 1, 1)).toEqual([
      "One.",
      "One. Two.",
      "Two. Three.",
    ])
  })

  test("with overlap", () => {
    expect(chunkSentences("Hello. World", 5, 1)).toEqual([
      "Hello.",
      "Hello. World",
    ])
    expect(chunkSentences("Hello. World", 10, 1)).toEqual(["Hello.", "World"])
    expect(chunkSentences("Hello. World", 20, 1)).toEqual(["Hello. World"])
    expect(() => chunkSentences("Hello. World", 0, 1)).toThrow()
    expect(chunkSentences("Hello. World", 1, 1)).toEqual([
      "Hello.",
      "Hello. World",
    ])
    expect(chunkSentences("Hello? World", 1, 1)).toEqual([
      "Hello?",
      "Hello? World",
    ])
    expect(chunkSentences("Hello!", 1, 1)).toEqual(["Hello!"])
  })
})

describe("splitParagraphs", () => {
  test("should split text into paragraphs", () => {
    const text = `This is a paragraph.
    This is another paragraph.
    This is yet another paragraph.`
    const result = splitParagraphs(text)
    expect(result).toEqual([
      { text: "This is a paragraph." },
      { text: "This is another paragraph." },
      { text: "This is yet another paragraph." },
    ])
  })

  test("should handle empty input", () => {
    const text = ""
    const result = splitParagraphs(text)
    expect(result).toEqual([])
  })

  test("should handle page numbers", () => {
    const text = `This is a paragraph.
    1
    This is another paragraph.
    2
    This is yet another paragraph.`
    const result = splitParagraphs(text)
    expect(result).toEqual([
      { text: "This is a paragraph." },
      { text: "This is another paragraph.", page: 2 },
      { text: "This is yet another paragraph.", page: 3 },
    ])
  })
})

