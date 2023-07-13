import { type Element } from "hast-util-select/lib"

export const getHref = (url: URL, a: Element): URL => {
  const href = a.properties?.href
  if (typeof href !== "string") throw new Error(JSON.stringify(a))

  const ret = new URL(href, url.origin)
  ret.protocol = "https:"
  return ret
}
