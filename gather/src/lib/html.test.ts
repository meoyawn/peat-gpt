import { expect, test } from "vitest"
import { getHref } from "./html"

test("getHref", () => {
  expect(
    getHref(
      new URL(
        "https://towardsdatascience.com/transcribe-audio-files-with-openais-whisper-e973ae348aa7",
      ),
      {
        type: "element",
        tagName: "a",
        children: [],
        properties: {
          href: "foo/bar",
        },
      },
    ),
  ).toEqual(new URL("https://towardsdatascience.com/foo/bar"))

  expect(
    getHref(
      new URL(
        "https://towardsdatascience.com/transcribe-audio-files-with-openais-whisper-e973ae348aa7",
      ),
      {
        type: "element",
        tagName: "a",
        children: [],
        properties: {
          href: "http://listenbox.app/guides",
        },
      },
    ),
  ).toEqual(new URL("https://listenbox.app/guides"))
})
