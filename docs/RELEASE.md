# Release & Rollback

## Versioning
- SemVer: MAJOR.MINOR.PATCH
- Tag format: vX.Y.Z

## When to cut a release
- DoD satisfied and CI green
- No HIGH/CRITICAL dependency vulns
- Coverage gate met

## Steps
1. Update CHANGELOG and bump version.
2. Tag: `git tag vX.Y.Z && git push --tags`
3. Create GitHub Release with highlights and breaking changes.

## Rollback
- Revert commit: `git revert <sha>` and retag as PATCH.
- If feature-flagged, set flag OFF and ship hotfix.
