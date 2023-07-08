import { readFile, writeFile } from "fs/promises"
import { expect, test } from "vitest"
import { downloadArticles } from "./articles"

test.skip(
  "download",
  async () => {
    await downloadArticles("data/articles/")
  },
  { timeout: 1_000_000 },
)

const NEWLINE = "abcdefghij"
const WHITESPACE = "klmnopqrst"

const articleTypes = [
  {
    articles: [
      "fatigue-aging-recuperation",
      "meat-physiology-stress",
      "physiology-texts-and-the-real-world",
    ],
    replacements: [
      ["\n\n\n\n", "\n"],
      ["\n\n", "\n"],
    ],
    lineCountLimit: 228,
  },
  {
    articles: ["cholesterol-longevity"],
    replacements: [
      [" \n\n      \n                  \n\n\n", NEWLINE],
      ["\n\n \n\n\n\n\n\n    \n\n", NEWLINE],
      ["\n \n\n    \n", NEWLINE],
      [" \n\n \n\n\n", NEWLINE],
      [" \n\n\n \n\n", NEWLINE],
      ["  \n\n \n\n", NEWLINE],
      [" \n\n \n\n", NEWLINE],
      ["\n\n\n", NEWLINE],
      ["\n\n", NEWLINE],

      [" \n", WHITESPACE],

      [NEWLINE, "\n"],
      [WHITESPACE, " "],
    ],
    lineCountLimit: 165,
  },
  {
    articles: ["cancer-disorder-energy"],
    replacements: [
      ["\n\n\n\n", NEWLINE],
      ["\n\n", WHITESPACE],
      [NEWLINE, "\n"],
      [WHITESPACE, " "],
    ],
    lineCountLimit: 228,
  },
]

test("fix broken articles", async () => {
  for (const { articles, replacements, lineCountLimit } of articleTypes) {
    for (const article of articles) {
      const text = await readFile(`data/articles/${article}.txt`, "utf-8")
      const fixed = replacements.reduce(
        (text, [from, to]) => text.replaceAll(from, to),
        text,
      )
      expect(fixed.split("/n").length).toBeLessThanOrEqual(lineCountLimit)
      await writeFile(`data/articles/fixed/${article}.txt`, fixed)
    }
  }
})
