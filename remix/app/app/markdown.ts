import rehypeExternalLinks from "rehype-external-links"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

const pipeline = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeExternalLinks, { target: "_blank", rel: "noreferrer" })
  .use(rehypeStringify)
  .freeze()

export const md2Html = (md: string): string =>
  pipeline.processSync(md).toString()
