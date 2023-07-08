import { cliText } from "./node"

export const tikaText = async (url: string): Promise<string> => {
  const text = await cliText("tika", "-T", url)
  if (text.length >= 100) return text

  return await cliText("tika", "-t", url)
}
