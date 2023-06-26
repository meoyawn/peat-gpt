import { describe, expect, test } from "bun:test"
import { joinEvery, type TtmlCue } from "./ttml"

describe("joinEvery", () => {
  const cues: TtmlCue[] = [
    { text: "Hello", begin: "0:0:0.0", end: "0:0:1.0", style: "s1" },
    { text: "World", begin: "0:0:1.0", end: "0:0:2.0", style: "s1" },
    { text: "How", begin: "0:0:3.0", end: "0:0:4.0", style: "s1" },
    { text: "Are", begin: "0:0:4.0", end: "0:0:5.0", style: "s1" },
    { text: "You", begin: "0:0:7.0", end: "0:0:8.0", style: "s1" },
  ]

  test("no join", () => {
    expect(joinEvery(cues, 1_000)).toEqual([
      { text: "Hello", begin: "0:0:0.0", end: "0:0:1.0", style: "s1" },
      { text: "World", begin: "0:0:1.0", end: "0:0:2.0", style: "s1" },
      { text: "How", begin: "0:0:3.0", end: "0:0:4.0", style: "s1" },
      { text: "Are", begin: "0:0:4.0", end: "0:0:5.0", style: "s1" },
      { text: "You", begin: "0:0:7.0", end: "0:0:8.0", style: "s1" },
    ])
  })

  test("join", () => {
    expect(joinEvery(cues, 2_000)).toEqual([
      { text: "Hello World", begin: "0:0:0.0", end: "0:0:2.0", style: "s1" },
      { text: "How Are", begin: "0:0:3.0", end: "0:0:5.0", style: "s1" },
      { text: "You", begin: "0:0:7.0", end: "0:0:8.0", style: "s1" },
    ])
  })
})
