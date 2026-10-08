# Contributing to Noble Shapes

Thanks for helping improve the catalogue, renderers, or site. Bug reports, examples, documentation fixes, and focused pull requests are welcome.

## Local setup

Use a current Node.js release and Corepack. From the repository root:

```sh
corepack enable
pnpm install
pnpm dev
```

`pnpm test` builds every package and the site, checks types, and runs the geometry, image, export, and social image tests. Include a small reproducible example with a bug report. For a visual change, attach before and after images at desktop and mobile sizes.

Package maintainers can run `pnpm release:check` to inspect the publishable tarballs as well. The publication order and post-release checks are in [RELEASING.md](RELEASING.md).

## Geometry contributions

The [catalogue](CATALOGUE.md) and [geometry notes](docs/geometry.md) explain the naming and face-cycle conventions. Keep mathematical face cycles independent of drawing code. New constructions should come from a stated mathematical rule with tests for expected counts and symmetry, rather than copied model data. The project is independently implemented from published mathematical descriptions and does not accept code or models copied from GPL-licensed tools.

For renderer work, compare the browser result with the Node PNG renderer and run the relevant benchmark (`pnpm bench --shape cube` or `pnpm bench --shape <id>`). Describe any image or performance change in the pull request.

Contributions are submitted under this repository's [MIT license](LICENSE).
