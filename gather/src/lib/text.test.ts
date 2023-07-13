import { describe, expect, test } from "vitest"
import { splitParagraphs, splitSentences } from "./text"

describe("splitSentences", () => {
  test("split on sentence max len", () => {
    expect(splitSentences("hello. world", 10)).toEqual(["hello.", "world"])
    expect(splitSentences("hello. world", 20)).toEqual(["hello. world"])
    expect(() => splitSentences("hello. world", 0)).toThrow()
    expect(splitSentences("hello. world", 1)).toEqual(["hello.", "world"])
    expect(splitSentences("hello? world", 1)).toEqual(["hello?", "world"])
    expect(splitSentences("hello!", 1)).toEqual(["hello!"])

    // test with longer and complex text
    expect(
      splitSentences("This is a test. I love programming. Do you?", 25),
    ).toEqual(["This is a test.", "I love programming.", "Do you?"])

    // test with no sentence terminators
    expect(
      splitSentences("This is a test I love programming Do you", 25),
    ).toEqual(["This is a test I love programming Do you"])

    // test with all sentence terminators and no words
    expect(splitSentences("...!?!", 3)).toEqual(["...", "!?!"])

    // test with empty string
    expect(splitSentences("", 1)).toEqual([""])

    // test with maxLen larger than the string length
    expect(splitSentences("Hello world!", 50)).toEqual(["Hello world!"])

    // test with sentence longer than maxLen
    expect(
      splitSentences(
        "This is a really long sentence that exceeds the max length.",
        10,
      ),
    ).toEqual(["This is a really long sentence that exceeds the max length."])
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
