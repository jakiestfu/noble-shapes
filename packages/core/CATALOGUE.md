# Finite noble polyhedra catalogue

The core package implements the 146 finite, nonprismatic forms in [Hill's classification](https://arxiv.org/pdf/2607.28711) (§5.2, Tables 5–13). The two infinite prismatic families are separate parameterized generators. `KNOWN_FINITE_COUNT` and `IMPLEMENTED_FINITE_COUNT` are both 146.

## How each form is built

The catalogue stores a generating point in mirror-distance coordinates, one cyclic face seed, a symmetry choice, and the expected vertex/edge/face counts. It does **not** store complete meshes. At runtime, the core builds the octahedral or icosahedral reflection group from Hill's matrices (Definitions 3.12–3.13), acts on the generating point to obtain all vertices, and acts on the seed cycle to obtain all faces. For rotational forms it uses the determinant-positive subgroup for faces, and for the `sC` and `sD` orbit types it also uses that subgroup for vertices.

The seed cycle is necessary classification data: a vertex orbit can admit several distinct noble facetings. A point and symmetry group alone therefore cannot select the intended face adjacency. The 137 seed entries plus nine named regular/star forms account for all 146 finite forms.

The face seeds were independently recovered from the paper's orbit coordinates and V/E/F tables with this reproducible search:

1. Generate the vertex orbit and enumerate planes through one vertex by considering every pair of other vertices. Vertex transitivity makes this sufficient.
2. Keep planes containing at least the required number of face vertices, where face length is `2E/F`.
3. For each candidate plane, generate its orbit under the form's symmetry group. Join two vertices in the plane when another plane in that orbit intersects it in exactly those two vertices.
4. Enumerate face cycles of the required length through the first vertex, then generate each entire face orbit.
5. Accept a cycle only when it has the expected V/E/F, each abstract edge belongs to exactly two faces, and each vertex figure is a single connected polygon.

[`scripts/recover-facets.mjs`](./scripts/recover-facets.mjs) implements this search using only Node. After building core, run `node packages/core/scripts/recover-facets.mjs --all` to independently recover and check every stored seed. `tests/geometry.test.mjs` also checks planarity, a common sphere, edge incidence, connected vertex figures, counts, and that recovery succeeds. The test checks geometric realizations numerically; it is not a new proof of completeness beyond Hill's classification.

## Identifiers and source errata

`KNOWN_FINITE_IDS` lists the paper's 146 symbols. The API uses familiar names for nine regular and Kepler–Poinsot forms. It uses descriptive IDs for eleven further forms whose exact within-tie paper numbering cannot be read from the paper's ordering rule: three `tI-5` pentagons, three `rD-5` pentagons, two each at `sD-5` and `sD-25`, plus the chiral `tI-5` hexagon. `CATALOGUE_ID_CANDIDATES` maps each descriptive ID to the corresponding possible paper symbol(s). The small stellated and great dodecahedra likewise share the `I-2`/`I-3` inradius tie. Where the paper's inradii differ, the numeric IDs follow descending inradius.

Several Appendix B approximate coordinates conflict with their printed minimal polynomials. The implementation uses the positive roots of those polynomials for `sD-3` **b** ≈ 0.17390637642569, `sD-16` **b** ≈ 0.78083000327643, and `gD-15` **a** ≈ 0.55463631656377. These corrected positions independently yield the listed V/E/F and valid vertex figures. Table 6 also calls `tI-5.6` a pentagon despite listing the chiral hexagon `rD-5.7` as its dual; the recovered `tI-5.6` faceting has six vertices per face. Other printed Schläfli or count inconsistencies are resolved by the independently validated geometric face cycles and V/E/F.

The catalogue coordinates are numerical approximations of algebraic positions, so consumers should allow floating-point tolerances when checking coplanarity. The package's face cycles are abstract polygons: many forms self-intersect, and intersections of edges or faces away from their abstract incidence do not introduce new vertices or edges.
