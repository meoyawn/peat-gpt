import { describe, expect, test } from "vitest"
import { removeExtension } from "./path"

describe("removeExtension", () => {
  test("should remove the extension from a filename with a path", () => {
    const path = "/path/to/file.txt"
    const result = removeExtension(path)
    expect(result).toEqual("file")
  })

  test("should remove the extension from a filename without a path", () => {
    const filename = "file.txt"
    const result = removeExtension(filename)
    expect(result).toEqual("file")
  })

  test("should return the original path if there is no extension", () => {
    const path = "/path/to/file"
    const result = removeExtension(path)
    expect(result).toEqual("file")
  })

  test("should return the original filename if there is no extension", () => {
    const filename = "file"
    const result = removeExtension(filename)
    expect(result).toEqual("file")
  })
})
