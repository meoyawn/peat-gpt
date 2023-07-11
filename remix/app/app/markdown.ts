import rehypeExternalLinks from "rehype-external-links"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

const unifiedMD = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeExternalLinks, { target: "_blank", rel: "noreferrer" })
  .use(rehypeStringify)

export const md2Html = (md: string): string =>
  unifiedMD.processSync(md).toString()
