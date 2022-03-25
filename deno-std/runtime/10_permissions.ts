import type { DenoNamespace } from "..";

export class PermissionStatus
  extends EventTarget
  implements DenoNamespace.PermissionStatus
{
  onchange = null;

  constructor(public readonly state: DenoNamespace.PermissionState = "denied") {
    super();
  }
}

const permissionStatuses: Record<
  DenoNamespace.PermissionName,
  PermissionStatus
> = {
  env: new PermissionStatus("granted"),
  ffi: new PermissionStatus(),
  hrtime: new PermissionStatus("granted"),
  net: new PermissionStatus(),
  read: new PermissionStatus("granted"),
  run: new PermissionStatus("granted"),
  write: new PermissionStatus("granted"),
};

export class Permissions implements DenoNamespace.Permissions {
  query(desc: DenoNamespace.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }

  revoke(desc: DenoNamespace.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }

  request(desc: DenoNamespace.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }
}
