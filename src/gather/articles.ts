import { exists, writeFile } from "fs/promises"
import { join } from "path"
import { fromHtml } from "hast-util-from-html"
import { selectAll } from "hast-util-select"
import { type Element } from "hast-util-select/lib"
import { filenameWithoutExtension, tikaText } from "./common"
import inputs from "./inputs.json"

const getHref = (a: Element): string => {
  if (!a.properties) throw new Error(JSON.stringify(a))
  const href = a.properties.href

  if (typeof href !== "string") throw new Error(JSON.stringify(a))
  return href.replace("http://", "https://")
}

export const downloadArticles = async (dir: string): Promise<void> => {
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
