# Releasing Noble Shapes

The npm names are `noble-shapes` for the umbrella package and `@noble-shapes/core`, `@noble-shapes/render`, `@noble-shapes/node`, and `@noble-shapes/web-component` for focused packages. The workbench is private to the monorepo and is not an npm release artifact.

1. Update the version in all five publishable package manifests together. Refresh `pnpm-lock.yaml` and review its diff.
2. Run `pnpm release:check`. This builds the site and packages, runs the geometry and renderer checks, and packs each npm artifact to check its exports, CLI files, README, license, and rewritten workspace dependencies.
3. Inspect a representative tarball with `pnpm --dir packages/web-component pack --pack-destination /tmp` if the package layout changed. Test the tarballs in a fresh project when changing imports, exports, or package dependencies.
4. Publish in dependency order: core, render, node and web component, then the `noble-shapes` umbrella package. Confirm access to the `@noble-shapes` npm scope and the `noble-shapes` package name before starting. Publishing changes the public registry and is a separate, intentional step.
5. After publication, update the installation text in the root README, package README, and site documentation, then verify imports and the CLI from npm in a clean project. Tag the release and deploy the documentation site.

Keep all published packages on the same version until the initial release process is established. `workspace:*` dependencies in the repository become exact package versions in tarballs; the archive check verifies this before publication.
