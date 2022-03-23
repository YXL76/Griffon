import type { DenoType } from "..";

export class PermissionStatus
  extends EventTarget
  implements DenoType.PermissionStatus
{
  onchange = null;

  constructor(public readonly state: DenoType.PermissionState = "denied") {
    super();
  }
}

const permissionStatuses: Record<DenoType.PermissionName, PermissionStatus> = {
  env: new PermissionStatus("granted"),
  ffi: new PermissionStatus(),
  hrtime: new PermissionStatus("granted"),
  net: new PermissionStatus(),
  read: new PermissionStatus("granted"),
  run: new PermissionStatus("granted"),
  write: new PermissionStatus("granted"),
};

export class Permissions implements DenoType.Permissions {
  query(desc: DenoType.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }

  revoke(desc: DenoType.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }

  request(desc: DenoType.PermissionDescriptor): Promise<PermissionStatus> {
    return Promise.resolve(permissionStatuses[desc.name]);
  }
}
