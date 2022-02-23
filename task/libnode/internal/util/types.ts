export function isAnyArrayBuffer(
  value: unknown
): value is ArrayBuffer | SharedArrayBuffer {
  return (
    value instanceof ArrayBuffer ||
    Object.prototype.toString.call(value) === "[object SharedArrayBuffer]"
  );
}

export function isArrayBufferView(
  value: unknown
): value is NodeJS.ArrayBufferView {
  return ArrayBuffer.isView(value);
}

export function isArgumentsObject(value: unknown) {
  return Object.prototype.toString.call(value) === "[object Arguments]";
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

export function isAsyncFunction(value: unknown) {
  return (
    typeof value === "function" && value.constructor.name === "AsyncFunction"
  );
}

export function isGeneratorFunction(value: unknown) {
  return (
    typeof value === "function" &&
    value.constructor.name === "GeneratorFunction"
  );
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isBooleanObject(value: unknown): value is Boolean {
  return value instanceof Boolean;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isNumberObject(value: unknown): value is Boolean {
  return value instanceof Number;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isStringObject(value: unknown): value is String {
  return value instanceof String;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isSymbolObject(value: unknown): value is Symbol {
  return typeof value === "object" && value instanceof Symbol;
}

export function isBoxedPrimitive(
  value: unknown
  // eslint-disable-next-line @typescript-eslint/ban-types
): value is Boolean | Number | String {
  return (
    value instanceof Boolean ||
    value instanceof Number ||
    value instanceof String ||
    value instanceof Object
  );
}

export function isDataView(value: unknown): value is DataView {
  return value instanceof DataView;
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

export function isExternal() {
  return false;
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

export function isProxy(value: unknown): value is typeof Proxy {
  return value instanceof Proxy;
}

export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

export function isGeneratorObject(value: unknown) {
  return Object.prototype.toString.call(value) === "[object Generator]";
}

export function isMap<K = unknown, V = unknown>(
  value: unknown
): value is Map<K, V> {
  return value instanceof Map;
}

export function isMapIterator(value: unknown) {
  return Object.prototype.toString.call(value) === "[object Map Iterator]";
}

export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return value instanceof Set;
}

export function isSetIterator(value: unknown) {
  return Object.prototype.toString.call(value) === "[object Set Iterator]";
}

export function isWeakMap(value: unknown) {
  return value instanceof WeakMap;
}

export function isWeakSet(value: unknown) {
  return value instanceof WeakSet;
}

export function isModuleNamespaceObject(value: unknown) {
  return (
    value instanceof Object &&
    Object.prototype.toString.call(value) === "[object Module]"
  );
}

export function isNativeError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isSharedArrayBuffer(
  value: unknown
): value is SharedArrayBuffer {
  return Object.prototype.toString.call(value) === "[object SharedArrayBuffer]";
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const typedArray = Object.getPrototypeOf(Uint8Array);

export function isTypedArray(value: unknown): value is NodeJS.TypedArray {
  return value instanceof typedArray;
}

export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

export function isUint8ClampedArray(
  value: unknown
): value is Uint8ClampedArray {
  return value instanceof Uint8ClampedArray;
}

export function isUint16Array(value: unknown): value is Uint16Array {
  return value instanceof Uint16Array;
}

export function isUint32Array(value: unknown): value is Uint32Array {
  return value instanceof Uint32Array;
}

export function isInt8Array(value: unknown): value is Int8Array {
  return value instanceof Int8Array;
}

export function isInt16Array(value: unknown): value is Int16Array {
  return value instanceof Int16Array;
}

export function isInt32Array(value: unknown): value is Int32Array {
  return value instanceof Int32Array;
}

export function isFloat32Array(value: unknown): value is Float32Array {
  return value instanceof Float32Array;
}

export function isFloat64Array(value: unknown): value is Float64Array {
  return value instanceof Float64Array;
}

export function isBigInt64Array(value: unknown): value is BigInt64Array {
  return value instanceof BigInt64Array;
}

export function isBigUint64Array(value: unknown): value is BigUint64Array {
  return value instanceof BigUint64Array;
}
