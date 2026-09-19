# InstallReady

> Does this repo actually install cleanly on Linux?

InstallReady checks installer and bootstrap scripts across Linux distributions before users discover the breakage for you.

It combines fast static analysis with real runtime verification powered by [OpsScript Gate](https://github.com/Mresyzz/opsscript-gate).

## What it does

Paste a public GitHub repository and InstallReady can:

- discover likely installer scripts such as `install.sh`, `setup.sh`, and `bootstrap.sh`
- detect distro-specific assumptions such as `apt-get`, `apk`, `dnf`, and `yum`
- identify likely compatibility issues across Debian, Ubuntu, and Alpine
- show exact commands and line numbers for detected problems
- generate a ready-to-copy GitHub Actions workflow
- display real runtime results when verified with OpsScript Gate
- generate shareable compatibility reports and badges

## Example

```text
owner/project
install.sh

Linux Install Compatibility

Debian 12        ✅ PASS
Ubuntu 22.04     ✅ PASS
Ubuntu 24.04     ✅ PASS
Alpine 3.20      ❌ FAIL

Alpine 3.20
Line 43

apt-get: command not found

Suggested fix:
Alpine normally uses apk instead of apt-get.
