# Moving driveiq-v2 into the DriveIQ GitHub org

Two options — transfer keeps history, stars, issues and auto-redirects old URLs, so prefer it.

## Option A — Transfer the existing repo (recommended)

1. On github.com open your `driveiq-v2` repo → **Settings** → scroll to **Danger Zone** → **Transfer ownership**.
2. Type the org name (e.g. `driveiq`) as the new owner. You need **admin** on the repo and permission to create repos in the org — if you don't have that, ask the org owner (Zakariye?) to grant it or to accept the transfer request.
3. If the org already has a repo named `driveiq-v2`, rename one first (Settings → General → Repository name), e.g. keep the org's old one as `driveiq-v1`.
4. GitHub redirects the old URL, but update your local remote anyway:

```bash
git remote set-url origin git@github.com:DRIVEIQ-ORG/driveiq-v2.git
git remote -v   # verify
```

## Option B — "Join them up" (push v2 into an existing org repo)

Only if Zakariye wants v2 to live inside the existing org repo rather than as its own repo:

```bash
git remote add org git@github.com:DRIVEIQ-ORG/EXISTING-REPO.git
git push org main:v2   # v2 code lands on a `v2` branch, history intact
```

Then open a PR from `v2` → their default branch, or agree to make `v2` the default branch. Don't force-push over their `main`.

## After the move — checklist

- **EAS/Expo builds**: unaffected — EAS links to the Expo account/project (`app.json` / `eas.json`), not to GitHub. If GitHub Actions or EAS "Build from GitHub" is configured, re-connect the repo in the Expo dashboard.
- **Secrets**: repo-level GitHub secrets do NOT transfer visibility to org members automatically — re-check Actions secrets if any exist.
- **Collaborators**: personal-repo collaborators are dropped; re-add via org teams.
- **Branch protection**: re-create rules on the org repo.
- **`.env` stays local** — confirm it's in `.gitignore` before the org gains more members (it currently holds live API keys).
