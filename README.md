# Peat-gpt

A TypeScript retrieval-augmented generation (RAG) assistant built in 2023 to
answer questions using excerpts from Ray Peat's writings and interviews.

The ingestion pipeline extracts text from web pages and PDFs, parses interview
captions, and splits text into overlapping chunks. It creates OpenAI embeddings,
retrieves related excerpts from Pinecone, and passes source metadata into the
chat context for page, URL, and interview-timestamp references. The chat interface
uses React and Remix, with a Cloudflare Pages server adapter.

This is a historical source release. It uses the original API clients and model
names; dependency and provider compatibility need checking before running it.

## Source layout

- `gather/src/app/gather/`: collection scripts and source configuration.
- `gather/src/app/prepare/`: chunking, transcription preparation, and embeddings.
- `gather/src/app/db/`: Pinecone maintenance and ingestion jobs.
- `gather/src/app/bot.ts`: semantic retrieval and chat-context construction.
- `gather/src/lib/`: text, caption, URL, and process helpers.
- `remix/`: the chat interface and server-side chat endpoint.
- `Makefile`: the original OpenAPI client-generation commands.

Generated clients live in the ignored `gen/` directory. The Makefile's upstream
schemas can change independently of this code, so reproducing the original build
may require matching schema versions. The workspaces and `pnpm-lock.yaml` record
the original dependencies. The scripts use Bun; ingestion also uses external
tools such as Apache Tika, yt-dlp, and FFmpeg.

## Credentials and local data

Copy `gather/.env.example` to `gather/.env` for ingestion, and
`remix/.dev.vars.example` to `remix/.dev.vars` for local Cloudflare Pages work.
Fill in your own credentials and Pinecone endpoint. All values in the examples
are intentionally empty.

The `VITE_OPENAPI_KEY`, `VITE_PINECONE_KEY`, and `VITE_PINECONE_BASE` names are
legacy names used by this implementation. Keep them in server-side environment
variables or Cloudflare bindings; do not expose them through browser environment
injection. `VITE_DOWNLOADS_DATA_DIR` is an optional local input directory used by
the audio-ingestion jobs.

Environment files, Cloudflare local state, generated clients, and `data/` are
ignored. Do not commit credentials, downloaded documents, transcripts, embeddings,
database exports, chat histories, or logs. Review staged files before pushing;
ignore rules do not protect files that were already committed.

## Running jobs and deploying

Files under `gather/src/app/` ending in `.test.ts` include operational jobs.
They can download content, send text or audio to external APIs, incur charges,
and upsert or delete Pinecone records. Do not run the entire test tree against
an existing account or database. Deterministic helper tests are under
`gather/src/lib/`.

The chat endpoint has no application-level authentication or rate limiting.
Its retrieval endpoint returns matching source metadata, and its chat response
includes retrieved context. Use only a corpus you intend to expose to users,
and add access and usage controls before a public deployment. The assistant's
generated answers are not medical advice.

## Corpus and third-party material

Downloaded documents, newsletters, correspondence, transcripts, embeddings, and
database contents are not distributed with this source release. The book URL list
is empty; supply only sources you have permission to process. Remaining source
URLs record the original public-source integrations and do not grant permission
to download, process, or redistribute their content. Review the source's terms
and any personal data before running an ingestion job.

The [MIT license](LICENSE) covers this project's code and documentation.
Third-party documents, model services, dependencies, and source websites retain
their own terms and licenses. See [third-party notices](THIRD_PARTY_NOTICES.md).
