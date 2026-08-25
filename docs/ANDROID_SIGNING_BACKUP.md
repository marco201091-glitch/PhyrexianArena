# Android signing backup

The permanent Android signing key must remain recoverable if the build VM,
GitHub account, or local disk is lost. A GitHub secret and a DPAPI credential
file are not backups: GitHub secrets cannot be exported, and DPAPI data is tied
to the Windows account and machine that created it.

## Current verified source

The local source is `D:\VM_Server_APP\android-release`. Its keystore is readable,
its private key can be addressed by the stored alias, and its certificate SHA-256
is the value declared in the F-Droid `AllowedAPKSigningKeys` metadata. Do not move,
rename, or delete these files until recovery from both offline copies has passed.

## Prepare the encryption key off the VM

1. On a trusted device that is not the build VM, create a GPG encryption key.
2. Store two copies of its private key and revocation certificate in independent
   offline locations. Protect them with a strong, unique passphrase.
3. Export only the public key in binary form, Base64-encode it, and add it as the
   GitHub repository variable `RELEASE_BACKUP_GPG_PUBLIC_KEY_BASE64`.

The private GPG key and its passphrase must never be stored in GitHub, this
repository, or the build VM.

## Automatic rolling export

After the repository variable is configured, GitHub runs the export every
Sunday at 03:17 UTC. Each encrypted artifact is retained for 21 days, leaving
three overlapping weekly recovery points. The job uses a GitHub-hosted runner,
does not run an app build, and does not consume build-VM CPU, RAM, or disk.
Scheduled runs are safely skipped until the public-key variable exists.

The workflow can also be started manually to test configuration or create an
immediate recovery point. A failed scheduled export does not delete older
artifacts, and concurrent exports are disabled.

GitHub artifacts are an automated off-VM safety copy, but several artifacts in
the same GitHub account are not two independent offline backups. The following
one-time procedure is still required to satisfy disaster recovery and the
release checklist.

## Create the two independent backups

1. Manually run the `Export encrypted Android signing backup` workflow once.
2. Download its artifact within 21 days. The workflow uploads only a GPG
   encrypted archive and its SHA-256 checksum; plaintext exists only in the
   temporary GitHub runner directory and is removed before upload.
3. Verify the checksum, then copy the encrypted archive and checksum to two
   independent off-VM locations, for example an offline USB drive and a separate
   encrypted cloud vault. Do not count two folders on the same disk as two copies.
4. Delete the downloaded working copy after both destinations are verified.

The archive is tiny (only the keystore, credentials, and a manifest), so the
rolling exports do not consume meaningful storage.

## Mandatory recovery test

On the trusted offline device, decrypt one copy, extract it into a temporary
directory, and verify all of the following:

- the encrypted-file SHA-256 matches its `.sha256` file;
- the extracted keystore SHA-256 matches `manifest.txt`;
- `keytool -list -v` reports certificate SHA-256
  `5d25e32cdf901becfba81adf93189e1d755e50a90b897efa21da4c2ab3002106`;
- the alias and both passwords in `credentials.json` can sign and verify a
  disposable test JAR or APK;
- the second offline copy has the same encrypted-file SHA-256.

Securely remove the decrypted temporary directory after the test. Record only
the test date, locations, and non-secret checksums; never record passwords in
the repository.
