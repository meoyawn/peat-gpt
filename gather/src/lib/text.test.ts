import { describe, expect, test } from "vitest"
import { splitParagraphs, splitSentences, splitWords } from "./text"

describe("splitSentences", () => {
  test("quoted sentence", () => {
    expect(
      splitSentences(`He saw her. "She's hot." That was his first thought.`, 5),
    ).toEqual(["hello.", "world"])
  })

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

describe("splitWords", () => {
  test("simple", () => {
    expect(splitWords("hello world", 1, 0)).toEqual(["hello", "world"])
    expect(splitWords("hello world", 20, 0)).toEqual(["hello world"])
  })

  test("overlapped", () => {
    expect(() => splitWords("hello world", 0, 1)).toThrowError()
    expect(splitWords("hello world", 1, 1)).toEqual(["hello", "hello world"])
    expect(splitWords("hello world", 5, 5)).toEqual(["hello", "hello world"])
    expect(splitWords("one two three", 1, 1)).toEqual([
      "one",
      "one two",
      "two three",
    ])
  })

  test("empty string", () => {
    expect(splitWords("", 1, 0)).toEqual([])
    expect(splitWords("", 5, 5)).toEqual([])
  })

  test("string with only whitespaces", () => {
    expect(splitWords("     ", 1, 0)).toEqual([""])
    expect(splitWords("     ", 2, 1)).toEqual([""])
  })

  test("string with a single word", () => {
    expect(splitWords("word", 1, 0)).toEqual(["word"])
    expect(splitWords("word", 5, 5)).toEqual(["word"])
  })

  test("chunkLen or overlapLen exceeds text length", () => {
    expect(splitWords("short", 10, 0)).toEqual(["short"])
    expect(() => splitWords("short", 0, 10)).toThrowError()
    expect(splitWords("short", 10, 10)).toEqual(["short"])
  })

  test("negative chunkLen or overlapLen", () => {
    expect(() => splitWords("hello world", -1, 0)).toThrowError()
    expect(() => splitWords("hello world", 0, -1)).toThrowError()
    expect(() => splitWords("hello world", -1, -1)).toThrowError()
  })
})
