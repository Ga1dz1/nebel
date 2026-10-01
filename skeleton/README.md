# Public image skeleton

The public skeleton defines the stable boundary between Nebel releases and
private build components.

Publicly documented inputs:

- image name, version, channel, and release metadata;
- supported devices and their display/storage requirements;
- release artifact names and checksums;
- user-facing installation, upgrade, rollback, and recovery behavior.

Private build inputs include implementation sources, custom compositor work,
control-panel code, device drivers, DUO integration, signing configuration,
and internal package recipes. They are delivered only through signed image
artifacts and the private build pipeline.

Changes to the public contract should remain backward-compatible with already
released images. Internal components may evolve without exposing their source
layout in this repository.

