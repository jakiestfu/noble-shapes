# Releasing Noble Shapes

Only `noble-shapes` is published to npm. `@noble-shapes/core`, `@noble-shapes/render`, `@noble-shapes/node`, and `@noble-shapes/web-component` are private workspace packages that tsdown bundles into the public package. The Next app continues to use those workspace packages and remains deployed as a Git submodule.

## Version and verification

1. Change the `version` in the root `package.json`. This is the release version source.
2. Run `pnpm release:sync` to copy that version to all five package manifests, then `pnpm install` to refresh the lockfile. Commit all version and lockfile changes together.
3. Run `pnpm release:check`. It builds the packages and site, runs tests, creates the public tarball, installs it in an empty project, and checks all exports and the CLI. `pnpm release:pack` creates the same publishable tarball in `release/` for manual inspection.

The `publish.yml` GitHub Actions workflow runs on every push to `main`. After verification, it checks npm for the root version, then publishes only a missing `noble-shapes` version with provenance. Pushes without a version bump skip publication. The workflow uses npm trusted publishing; no npm token is stored in GitHub.

## First release setup

npm requires the package to exist before a trusted publisher can be configured. For the first release, publish the verified `release/noble-shapes-<version>.tgz` archive manually from an npm account with rights to `noble-shapes`:

```sh
pnpm release:check
pnpm release:pack
npm login
npm publish release/noble-shapes-<version>.tgz --access public
```

Then, in the `noble-shapes` package settings on npmjs.com, add a GitHub Actions trusted publisher with owner `jakiestfu`, repository `noble-shapes`, workflow filename `publish.yml`, and permission to run `npm publish`. This first configuration must be used for a successful publish within two days. Bump the root version for the next release. A push to `main` will then publish it automatically.

If the initial publish has not happened, the workflow's first publish attempt will fail at npm authentication. Once the manual bootstrap and trusted publisher setup are complete, the next version bump and push will use the automatic path. The `@noble-shapes/*` packages must remain private and are never published individually.
