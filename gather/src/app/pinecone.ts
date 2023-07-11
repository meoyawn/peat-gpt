import { Configuration, VectorOperationsApi } from "../../../gen/pinecone"

export const mkPinecone = (
  basePath: string = process.env.VITE_PINECONE_BASE!,
  apiKey: string = process.env.VITE_PINECONE_KEY!,
): VectorOperationsApi =>
  new VectorOperationsApi(new Configuration({ basePath, apiKey }))
