# Nebel OS

A Fedora bootc-based gaming system for ARM64 handhelds.

This repository is the public image skeleton: image recipe, release workflows,
public verification key and license notices. Runtime implementation and pinned
build carriers are maintained in private repositories. Control, DUO and device
driver implementation are not part of this public working tree.

Private hosting does not change existing license obligations. See
[LICENSE.md](LICENSE.md) and [source access](SOURCE-ACCESS.md). Required covered
source is provided through release downloads and the applicable written offer;
this is not an offer of access to the entire private Git repository.

## Release status

**Nebel OS 1.5.1 Aurora** is available through the **Stable** update channel.

- [Installer image](https://pub-b1313cdcc23d40dea4d423185bd9b5e4.r2.dev/nebel/nebel-1.5.1-Aurora.img.gz)
- [SHA256](https://pub-b1313cdcc23d40dea4d423185bd9b5e4.r2.dev/nebel/nebel-1.5.1-Aurora.img.gz.sha256)
- [Release notes / Примітки до випуску](https://github.com/Ga1dz1/nebel/releases/tag/1.5.1)

Bluetooth Controller Mode remains WIP. See the release notes for current
model-specific limitations and installation notes.

## Device scope

The common image carries 19 device-tree variants across SM4450, SM8250,
SM8550, SM8650 and SM8750. Retroid profiles include Pocket Classic,
Pocket Mini/Mini V2, Pocket 5, Flip 2 and Pocket 6. Hardware capabilities and
available settings depend on the model.

## Building the skeleton

Building requires ARM64 container tooling and authorized registry access to
the immutable private carriers referenced by Containerfile. A public clone
alone does not grant access to those carriers. The applicable source-access
rights remain as described above.

The release process signs an approved immutable image and verifies it with the
existing public key before changing update channels. Private signing keys and
registry credentials are never part of this repository or source downloads.

## Safety

This is actively developed software. Back up Android and personal data before
installation. Flashing an incompatible ABL can prevent booting or damage data.
Only use the approved device/SoC-specific payload from a qualified release.

The default account is `nebel` with password `nebel`. SSH is disabled by default;
change the password before enabling it on a network you do not fully trust.

Nebel grew from work around Armada and retains upstream component licenses,
including software and device support originating from ROCKNIX and other
projects. This repository split is not a proprietary relicensing of those works.
