import { cliText } from "./node"

export const tikaText = async (url: URL): Promise<string> => {
  const text = await cliText("tika", "-T", url.toString())
  if (text.length <= 200) throw new Error(JSON.stringify({ url, text }))
  return text
}
