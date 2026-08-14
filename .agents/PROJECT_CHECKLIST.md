# Project checklist

## In progress

- [ ] Monitor the corrected GitLab pipeline for F-Droid MR !44721 through completion.

## External follow-up

- [ ] Await the GitLab pipeline and F-Droid maintainer review for MR !44721.
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
