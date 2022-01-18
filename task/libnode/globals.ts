/// <reference types="node/globals" />

function _require(id: string) {
    console.log(id);
}

export const nodeRequire: NodeRequire = _require;
