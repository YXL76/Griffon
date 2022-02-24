const nodeInternalPrefix = "__node_internal_";

// This function removes unnecessary frames from Node.js core errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hideStackFrames(fn: (...args: any[]) => unknown) {
  // We rename the functions that will be hidden to cut off the stacktrace
  // at the outermost one
  const hidden = nodeInternalPrefix + fn.name;
  Object.defineProperty(fn, "name", { value: hidden });
  return fn;
}
