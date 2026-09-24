# Release notes

One file per release, named after the version the release will carry: `9.0.0.md`
for tag `v9.0.0`.

The Android release workflow reads `docs/releases/<version>.md` and uses it as
the GitHub release body, appending the standard install and checksum trailer.
**If the file is missing, the workflow falls back to GitHub's generated notes**
(`--generate-notes`), which list the merged pull requests.

Nothing fails when a file is missing — but a release published without one will
describe itself only as a list of pull request titles. Write the file for any
release that changes behaviour users can notice.

## What to put in it

Write for the person deciding whether to install the update: what changed for
them, and whether they have to do anything.

- Lead with the changes a user would notice, most important first.
- Say explicitly when an update is **not** required, and when it is.
- Skip internal refactors, dependency bumps and CI changes unless they change
  behaviour.
- Keep the version heading: the workflow appends a trailer after your text.

Do not repeat the install instructions or the checksum note: the workflow adds
them to every release.
