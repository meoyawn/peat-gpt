import { spawn } from "child_process"

export const cliText = async (...cmd: ReadonlyArray<string>): Promise<string> =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line no-console
    console.log(cmd.join(" "))

    const [command, ...args] = cmd
    const child = spawn(command, args)

    let data = ""
    child.stdout.on("data", chunk => (data += chunk))

    let error = ""
    child.stderr.on("data", chunk => (error += chunk))

    child.on("error", reject)
    child.on("close", code => {
      if (code === 0) {
        resolve(data.trim())
      } else {
        reject(error || `'${cmd.join(" ")}' exit code ${String(code)}`)
      }
    })
  })

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

export const tikaText = async (url: string): Promise<string> => {
  const text = await cliText("tika", "-T", url)
  if (text.length >= 100) return text

  return await cliText("tika", "-t", url)
}
