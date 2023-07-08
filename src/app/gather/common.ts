export const finalURL = async (url: string): Promise<string> => {
  const head = await fetch(url, { method: "HEAD", redirect: "follow" })
  if (head.ok) return head.url

  const get = await fetch(url, { method: "GET", redirect: "follow" })
  if (get.ok) return get.url

  throw new Error(`${url} ${get.status}`)
}

export const removeExtension = (filename: string): string =>
  filename.replace(/\.[^.]+$/, "")

export const filenameWithoutExtension = (u: URL): string => {
  const filename = u.pathname.split("/").pop()
  if (!filename) throw new Error(String(u))

  return decodeURIComponent(removeExtension(filename))
}
