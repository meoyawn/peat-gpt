export const removeExtension = (filename: string): string =>
  filename.replace(/\.[^.]+$/, "")

export const filenameWithoutExtension = (u: URL): string => {
  const filename = u.pathname.split("/").pop()
  if (!filename) throw new Error(String(u))

  return decodeURIComponent(removeExtension(filename))
}
