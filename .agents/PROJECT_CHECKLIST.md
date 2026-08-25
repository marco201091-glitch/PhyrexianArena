# Project checklist

## In progress

- [x] Port Dev 8.1.0 features selectively to `fdroid-prep`.
- [x] Preserve the approved F-Droid metadata, reproducibility workflow, and non-free dependency exclusions.
- [x] Validate the local 8.1.0 F-Droid source before publishing any tag or MR update.
- [x] Post the final verified response to the F-Droid maintainer comments.
- [x] Publish the deterministic F-Droid 8.0.7 reference APK.
- [x] Update MR !44721 to the canonical 8.0.7 metadata.
- [x] Monitor the corrected GitLab pipeline through completion.

## External follow-up

- [ ] Await F-Droid maintainer review for MR !44721.
- [ ] PM must provide the original release keystore location so two encrypted, off-VM backups can be created and recovery-tested.

## Completed

- [x] Publish F-Droid 8.0.5 reference APK restricted to `arm64-v8a`.
- [x] Update F-Droid metadata to the canonical 8.0.5 release commit.
- [x] Read the latest maintainer comment on F-Droid MR !44721.
- [x] Split every F-Droid recipe command into its own YAML list entry.
- [x] Add upstream author, contact, website, issue tracker, and changelog metadata.
- [x] Validate YAML structure and the project F-Droid readiness gate.
- [x] Add `Binaries` and `AllowedAPKSigningKeys` to F-Droid MR !44721.
- [x] Verify the published APK hash and signing-certificate fingerprint.
