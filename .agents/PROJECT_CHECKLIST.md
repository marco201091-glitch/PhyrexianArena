# Project checklist

## In progress

- [x] Port Dev 8.1.0 features selectively to `fdroid-prep`.
- [x] Preserve the approved F-Droid metadata, reproducibility workflow, and non-free dependency exclusions.
- [x] Validate the local F-Droid source and metadata for 9.0.1.
- [x] Post the final verified response to the F-Droid maintainer comments.
- [x] Publish the deterministic F-Droid 8.0.7 reference APK.
- [x] Update MR !44721 to the canonical 8.0.7 metadata.
- [x] Monitor the corrected GitLab pipeline through completion.
- [x] Publish F-Droid metadata 9.0.1 pinned to public commit `cf4d8d4` and update GitLab MR !44721.
- [ ] Monitor GitLab MR !44721 / F-Droid pipeline for 9.0.1.

## External follow-up

- [ ] Await F-Droid maintainer review for MR !44721.

## Completed

- [x] Locate and validate the permanent Android release keystore and its DPAPI-protected credentials.
- [x] Confirm the keystore certificate matches the F-Droid `AllowedAPKSigningKeys` fingerprint.
- [x] Prepare a manual, short-lived, public-key-encrypted signing-backup export workflow.
- [x] Schedule lightweight weekly encrypted exports with three overlapping recovery points.
- [x] Configure the backup GPG key, create independent encrypted recovery copies, and pass an end-to-end signing recovery test.
- [x] Publish F-Droid 8.0.5 reference APK restricted to `arm64-v8a`.
- [x] Update F-Droid metadata to the canonical 8.0.5 release commit.
- [x] Read the latest maintainer comment on F-Droid MR !44721.
- [x] Split every F-Droid recipe command into its own YAML list entry.
- [x] Add upstream author, contact, website, issue tracker, and changelog metadata.
- [x] Validate YAML structure and the project F-Droid readiness gate.
- [x] Add `Binaries` and `AllowedAPKSigningKeys` to F-Droid MR !44721.
- [x] Verify the published APK hash and signing-certificate fingerprint.
