// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { RESC_TABLE } from "../..";

const DEFAULT_CHUNK_SIZE = 16_640;

function tryClose(rid: number) {
  try {
    RESC_TABLE.close(rid);
  } catch {
    // Ignore errors
  }
}

export function readableStreamForRid(rid: number) {
  return new ReadableStream<Uint8Array>({
    // TODO
    // type: "bytes",
    async pull(controller) {
      const v = new Uint8Array(controller.desiredSize ?? DEFAULT_CHUNK_SIZE);
      try {
        const resc = RESC_TABLE.getOrThrow(rid);
        if (resc.read === undefined) throw new Error(`rid: ${rid}`);

        const bytesRead = await resc.read(v);
        if (bytesRead === null) {
          tryClose(rid);
          controller.close();
        } else {
          controller.enqueue(v);
        }
      } catch (e) {
        controller.error(e);
        tryClose(rid);
      }
    },
    cancel() {
      tryClose(rid);
    },
    // TODO
    // autoAllocateChunkSize: DEFAULT_CHUNK_SIZE,
  });
}

export function writableStreamForRid(rid: number) {
  return new WritableStream<Uint8Array>({
    async write(chunk, controller) {
      try {
        let nwritten = 0;
        while (nwritten < chunk.length) {
          const resc = RESC_TABLE.getOrThrow(rid);
          if (resc.write === undefined) throw new Error(`rid: ${rid}`);
          nwritten += await resc.write(chunk.subarray(nwritten));
        }
      } catch (e) {
        controller.error(e);
        tryClose(rid);
      }
    },
    close() {
      tryClose(rid);
    },
    abort() {
      tryClose(rid);
    },
  });
}
