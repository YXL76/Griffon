export * from "buffer";

import { Buffer } from "buffer";

declare const self: WorkerGlobalScope /* eslint-disable-next-line @typescript-eslint/naming-convention */ &
  typeof globalThis & { Buffer: typeof Buffer };

// Inject the Buffer global into the worker context
self.Buffer = Buffer;
