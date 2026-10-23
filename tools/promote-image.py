#!/usr/bin/env python3
"""Promote only an explicitly approved signed digest; no shell interpolation.

Call from the serialized promotion workflow. Registry tags have no portable
compare-and-swap: other external writers must not publish release tags.
Multiple channel tags cannot change atomically; a failed copy stops the run.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

DIGEST = re.compile(r"sha256:[0-9a-f]{64}\Z")
TAG = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}\Z")
VERSION = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?\Z")
REPOSITORY = re.compile(r"ghcr\.io/[a-z0-9][a-z0-9_.-]*/[a-z0-9][a-z0-9_.-]*\Z")
RELEASE_LABEL = "io.nebel.release.version"


def run(args):
    return subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE).stdout


def inspect(ref, runner=run):
    result = json.loads(runner([
        "skopeo", "inspect", "--override-os", "linux", "--override-arch", "arm64",
        "docker://" + ref,
    ]))
    if not isinstance(result, dict) or not DIGEST.fullmatch(str(result.get("Digest", ""))):
        raise ValueError("Registry returned invalid image metadata")
    return result


def verify_image(repository, source, version, expected_digest, key, runner=run):
    # Validate everything before even making a read-only registry request.
    if not REPOSITORY.fullmatch(repository):
        raise ValueError("Expected an explicit lowercase ghcr.io owner/repository")
    if not TAG.fullmatch(source):
        raise ValueError("Invalid source tag")
    if version and (not VERSION.fullmatch(version) or len(version) > 128):
        raise ValueError("Invalid release version")
    if not DIGEST.fullmatch(expected_digest):
        raise ValueError("An approved sha256 digest is required")
    if not Path(key).is_file():
        raise ValueError("Missing signature verification key")

    selected = inspect(f"{repository}:{source}", runner)
    if selected["Digest"] != expected_digest:
        raise ValueError("Source tag changed or does not match the approved digest")
    pinned = f"{repository}@{expected_digest}"
    # Inspect by digest too: version metadata must belong to the verified image,
    # never to a mutable tag read later.
    image = inspect(pinned, runner)
    if image["Digest"] != expected_digest:
        raise ValueError("Digest lookup returned a different image")
    if image.get("Architecture") != "arm64" or image.get("Os") != "linux":
        raise ValueError("Expected a Linux ARM64 image")
    if version and (image.get("Labels") or {}).get(RELEASE_LABEL) != version:
        raise ValueError("Release version does not match the image's release label")
    runner(["cosign", "verify", "--key", str(key), pinned])
    return {"repository": repository, "digest": expected_digest,
            "version": version or None,
            "build_id": (image.get("Labels") or {}).get("org.opencontainers.image.version")}


def promote(repository, source, target, version, expected_digest, key, runner=run,
            replace_existing_version=False, expected_previous_digest=""):
    if target not in ("testing", "beta", "stable"):
        raise ValueError("Target must be testing, beta or stable")
    if target == "testing" and version:
        raise ValueError("Testing publication must not establish a release version")
    if target == "stable" and not version:
        raise ValueError("Stable promotion requires a permanent release version")
    verify_image(repository, source, version, expected_digest, key, runner)
    pinned = f"{repository}@{expected_digest}"

    if replace_existing_version:
        if (target != "stable" or version not in ("1.5.0", "1.5.1")
                or not source.startswith("candidate-")
                or not DIGEST.fullmatch(expected_previous_digest)
                or expected_previous_digest == expected_digest):
            raise ValueError("Replacement requires an explicit supported Stable repair and previous digest")
        if inspect(f"{repository}:stable", runner)["Digest"] != expected_previous_digest:
            raise ValueError("Stable moved since the repair was approved")
    elif expected_previous_digest:
        raise ValueError("Old digest is only valid for an explicit replacement")

    version_exists = False
    if version:
        listing = json.loads(runner(["skopeo", "list-tags", "docker://" + repository]))
        tags = listing.get("Tags") if isinstance(listing, dict) else None
        if not isinstance(tags, list) or any(not isinstance(t, str) for t in tags):
            raise ValueError("Cannot establish whether release tag already exists")
        version_exists = version in tags
        if version_exists:
            existing_digest = inspect(f"{repository}:{version}", runner)["Digest"]
            if existing_digest != expected_digest:
                if not replace_existing_version or existing_digest != expected_previous_digest:
                    raise ValueError("Release version already names a different image; refusing overwrite")
            elif replace_existing_version:
                raise ValueError("Version already has the repaired digest; inspect channels instead")
        elif replace_existing_version:
            raise ValueError("Expected existing release version tag is missing")

    def copy(tag):
        runner(["skopeo", "copy", "--all", "--preserve-digests",
                "docker://" + pinned, f"docker://{repository}:{tag}"])
        if inspect(f"{repository}:{tag}", runner)["Digest"] != expected_digest:
            raise ValueError(f"Published tag {tag} does not match approved digest; stopping")

    # Establish the permanent pin before changing a user's OTA channel.
    if version and (not version_exists or replace_existing_version):
        copy(version)
    copy(target)
    if target == "stable":
        copy("latest")
    return {"repository": repository, "digest": expected_digest,
            "channel": target, "version": version or None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ("repository", "source", "expected-digest", "key"):
        parser.add_argument("--" + field, required=True)
    parser.add_argument("--target")
    parser.add_argument("--verify-only", action="store_true", help="Read-only qualification for disk builds; never retag")
    parser.add_argument("--version", default="")
    parser.add_argument("--replace-existing-version", action="store_true")
    parser.add_argument("--expected-previous-digest", default="")
    args = parser.parse_args()
    try:
        if args.verify_only:
            result = verify_image(args.repository, args.source, args.version, args.expected_digest, args.key)
        else:
            result = promote(args.repository, args.source, args.target, args.version,
                             args.expected_digest, args.key,
                             replace_existing_version=args.replace_existing_version,
                             expected_previous_digest=args.expected_previous_digest)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"Promotion stopped: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
