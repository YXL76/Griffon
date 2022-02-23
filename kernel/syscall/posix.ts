export interface IPosixSyscall {
  /**
   * Get the pathname of the current working directory
   * @description place an absolute pathname of the current working directory in the array pointed to by buf,
   * and return buf. The pathname shall contain no components that are dot or dot-dot, or are symbolic links.
   * @param buf the buffer to place the pathname in
   * @param size the size of the buffer
   * @throws EINVAL if the size is zero
   * @throws ERANGE if the buffer is too small
   * @throws EACCES if the process has not the required permissions
   * @throws ENOMEM if insufficient storage space is available
   * @returns the buffer if successful, or void if an error occurred
   * @see {@link https://pubs.opengroup.org/onlinepubs/9699919799/functions/getcwd.html getcwd}
   */
  getcwd(buf: Uint8Array, size: number): Uint8Array | void;

  /**
   * Get the process ID
   * @description The function shall return the process ID of the calling process.
   * @returns The function shall always be successful and no return value is reserved to indicate an error.
   * @see {@link https://pubs.opengroup.org/onlinepubs/9699919799/functions/getpid.html getpid}
   */
  getpid(): number;

  /**
   * Get the parent process ID
   * @description The function shall return the parent process ID of the calling process.
   * @returns The function shall always be successful and no return value is reserved to indicate an error.
   * @see {@link https://pubs.opengroup.org/onlinepubs/9699919799/functions/getppid.html getppid}
   */
  getppid(): number;
}
