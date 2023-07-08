import { access } from "fs/promises"
import { spawn } from "child_process"

export const exists = (path: string): Promise<boolean> =>
  access(path)
    .then(() => true)
    .catch(() => false)

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
