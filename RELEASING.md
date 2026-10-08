# Releasing Noble Shapes

Only `noble-shapes` is published to npm. `@noble-shapes/core`, `@noble-shapes/render`, `@noble-shapes/node`, and `@noble-shapes/web-component` are private workspace packages that tsdown bundles into the public package. The Next app continues to use those workspace packages and remains deployed as a Git submodule.

## Version and verification

1. Change the `version` in the root `package.json`. This is the release version source.
2. Run `pnpm release:sync` to copy that version to all five package manifests, then `pnpm install` to refresh the lockfile. Commit all version and lockfile changes together.
3. Run `pnpm release --check` to compare the root version and npm's current tag without publishing. Run `pnpm release` to verify, pack, and publish the root version. Stable releases become `latest`; prereleases become `next`. If the version is already published but its tag is stale, the command repairs the tag without republishing. It rejects unpublished versions lower than the newest npm release. `pnpm release:check` runs the build, tests, and a clean tarball installation without publishing; `pnpm release:pack` writes the tarball to `release/` for inspection.

The `publish.yml` GitHub Actions workflow runs on pushes to `main` in two jobs. **Test** runs `pnpm release:check`, then packs and uploads the verified tarball. **Release** waits for Test, downloads that same tarball, and runs `pnpm release:publish`. The publish command checks the root version against npm and skips publication when the version is already current. Pull requests and non-main pushes use the separate CI workflow. The Release job uses the `Production` GitHub environment to match npm's trusted publisher configuration, with OIDC authentication and automatic provenance; no npm token is stored in GitHub.

## First release setup

npm requires the package to exist before a trusted publisher can be configured. For the first release, run this from an npm account with rights to `noble-shapes`:

```sh
npm login
pnpm release
```

Then, in the `noble-shapes` package settings on npmjs.com, add a GitHub Actions trusted publisher with owner `jakiestfu`, repository `noble-shapes`, workflow filename `publish.yml`, environment `Production`, and permissions to run `npm publish` and `npm dist-tag`. The latter lets the workflow repair a stale `latest` or `next` tag if needed. This first configuration must be used for a successful publish within two days. Bump the root version for the next release. A push to `main` will then publish it automatically.

If the initial publish has not happened, the workflow's first publish attempt will fail at npm authentication. Once the manual bootstrap and trusted publisher setup are complete, the next version bump and push will use the automatic path. The `@noble-shapes/*` packages must remain private and are never published individually.
