import { basename, extname } from "path"

export const removeExtension = (path: string): string =>
  basename(path, extname(path))

export const filenameWithoutExtension = (u: URL): string =>
  decodeURIComponent(removeExtension(u.pathname))
