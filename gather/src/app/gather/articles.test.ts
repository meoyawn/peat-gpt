import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { fromHtml } from "hast-util-from-html"
import { selectAll } from "hast-util-select"
import { Element } from "hast-util-select/lib"
import { expect, test } from "vitest"
import { exists } from "../../lib/node"
import { tikaText } from "../../lib/tika"
import { filenameWithoutExtension } from "./common"
import inputs from "./inputs.json"

const getHref = (a: Element): string => {
  if (!a.properties) throw new Error(JSON.stringify(a))
  const href = a.properties.href

  if (typeof href !== "string") throw new Error(JSON.stringify(a))
  return href.replace("http://", "https://")
}

const downloadArticles = async (dir: string): Promise<void> => {
  const { articles } = inputs
  const r = await fetch(articles.url)
  const html = await r.text()
  const anchors = selectAll(articles.selector, fromHtml(html)).map(getHref)

  for (const url of anchors) {
    const file = join(dir, `${filenameWithoutExtension(new URL(url))}.txt`)
    if (await exists(file)) continue

    await writeFile(file, await tikaText(url))
  }
}

test(
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

test.skip("fix broken articles", async () => {
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
