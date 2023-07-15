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
