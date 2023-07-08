export const batchArray = <T>(
  arr: ReadonlyArray<T>,
  len: number,
): ReadonlyArray<Array<T>> => {
  const ret: Array<Array<T>> = []
  for (let i = 0; i < arr.length; i += len) {
    ret.push(arr.slice(i, i + len))
  }
  return ret
}
