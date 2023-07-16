export const chunkArray = <T>(
  arr: ReadonlyArray<T>,
  chunkLen: number,
): ReadonlyArray<Array<T>> => {
  const ret: Array<Array<T>> = []
  for (let i = 0; i < arr.length; i += chunkLen) {
    ret.push(arr.slice(i, i + chunkLen))
  }
  return ret
}

export async function arrayPromise<T>(
  gen: AsyncIterable<T>,
): Promise<ReadonlyArray<T>> {
  const out = Array<T>(0)
  for await (const x of gen) {
    out.push(x)
  }
  return out
}
