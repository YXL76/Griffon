const moduleIds = ["path"];
const loaderId = "internal/bootstrap/loaders";

export class NativeModule {
  static map = new Map(moduleIds.map((id) => [id, new NativeModule(id)]));

  canBeRequiredByUsers: boolean;

  private readonly filename: string;

  /**
   * States used to work around circular dependencies.
   */
  private loaded = false;

  /**
   * States used to work around circular dependencies.
   */
  private loading = false;

  /**
   * The CJS exports object of the module.
   */
  private exports = {};

  /**
   * The following properties are used by the ESM implementation and only
   * initialized when the native module is loaded by users.
   */
  // private module?: ModuleWrap;

  /**
   * Exported names for the ESM imports.
   */
  private exportKeys?: string[];

  constructor(private readonly id: string) {
    this.filename = `${id}.js`;
    this.canBeRequiredByUsers = !id.startsWith("internal/");
  }

  /**
   * To be called during pre-execution when --expose-internals is on.
   * Enables the user-land module loader to access internal modules.
   */
  static exposeInternals() {
    for (const [id, mod] of NativeModule.map) {
      // Do not expose this to user land even with --expose-internals.
      if (id !== loaderId) {
        mod.canBeRequiredByUsers = true;
      }
    }
  }

  static exists(id: string) {
    return this.map.has(id);
  }

  static canBeRequiredByUsers(id: string) {
    const mod = this.map.get(id);
    return mod && mod.canBeRequiredByUsers;
  }

  /**
   * Used by user-land module loaders to compile and load builtins.
   */
  compileForPublicLoader() {
    if (!this.canBeRequiredByUsers) {
      // No code because this is an assertion against bugs
      // eslint-disable-next-line no-restricted-syntax
      throw new Error(`Should not compile ${this.id} for public use`);
    }
    this.compileForInternalLoader();
    if (!this.exportKeys) {
      // When using --expose-internals, we do not want to reflect the named
      // exports from core modules as this can trigger unnecessary getters.
      const internal = this.id.startsWith("internal/");
      this.exportKeys = internal ? [] : Object.keys(this.exports);
    }
    // this.getESMFacade();
    // this.syncExports();
    return this.exports;
  }

  /* getESMFacade() {
    if (this.module) return this.module;
    if (this.exportKeys) {
      const url = `node:${this.id}`;
      const exportsKeys = this.exportKeys.slice();
      exportsKeys.push("default");
      this.module = new ModuleWrap(url, undefined, exportsKeys, function () {
        this.syncExports();
        this.setExport("default", this.exports);
      });
      // Ensure immediate sync execution to capture exports now
      this.module.instantiate();
      this.module.evaluate(-1, false);
      return this.module;
    }
  } */

  /**
   * Provide named exports for all builtin libraries so that the libraries
   * may be imported in a nicer way for ESM users. The default export is left
   * as the entire namespace (module.exports) and updates when this function is
   * called so that APMs and other behavior are supported.
   */
  /* syncExports() {
    if (this.module && this.exportKeys) {
      for (const exportName of this.exportKeys) {
        if (exportName === "default") continue;
        this.module.setExport(
          exportName,
          getOwn(this.exports, exportName, this.exports)
        );
      }
    }
  } */

  compileForInternalLoader() {
    if (this.loaded || this.loading) {
      return this.exports;
    }

    const id = this.id;
    this.loading = true;

    try {
      /* const requireFn = this.id.startsWith("internal/deps/")
        ? requireWithFallbackInDeps
        : nativeModuleRequire;

      const fn = compileFunction(id);
      fn(this.exports, requireFn, this, process, internalBinding, primordials); */

      this.loaded = true;
    } finally {
      this.loading = false;
    }

    // `moduleLoadList` is not defined in the `process` object.
    // moduleLoadList.push(`NativeModule ${id}`);
    return this.exports;
  }
}

// Think of this as module.exports in this file even though it is not
// written in CommonJS style.
const loaderExports = {
  // internalBinding,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  NativeModule,
  require: nativeModuleRequire,
};

function nativeModuleRequire(id: string) {
  if (id === loaderId) {
    return loaderExports;
  }

  const mod = NativeModule.map.get(id);
  // Can't load the internal errors module from here, have to use a raw error.
  // eslint-disable-next-line no-restricted-syntax
  if (!mod) throw new TypeError(`Missing internal module '${id}'`);
  return mod.compileForInternalLoader();
}

/**
 * Allow internal modules from dependencies to require
 * other modules from dependencies by providing fallbacks.
 */
function requireWithFallbackInDeps(request: string) {
  if (!NativeModule.map.has(request)) {
    request = `internal/deps/${request}`;
  }
  return nativeModuleRequire(request);
}
