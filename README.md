# Nebel OS

Nebel OS is a gaming-focused ARM64 image for supported handheld devices.

This repository is the public release surface. It contains the project
overview, release notes, image links, and the public skeleton contract. The
device image is assembled from maintained components that are not published in
this repository.

## Install

Download the image for your device from the latest [GitHub Release](/releases)
and follow the device-specific instructions included with that release.

## Public skeleton

The public contract for image metadata, release artifacts, and device support
is documented in [`skeleton/`](skeleton/README.md). It intentionally does not
contain internal compositor, control-panel, driver, or device-integration
implementation.

## Support

Use GitHub Issues for installation problems and hardware reports. Do not post
private logs, signing material, device identifiers, or unreleased build
artifacts in public issues.

