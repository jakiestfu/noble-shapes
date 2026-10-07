# Geometry model and catalogue

Hill's 2026 classification establishes 146 finite nonprismatic noble polyhedra up to similarity, plus the disphenoid and stephanoid families under the paper's definition. All 146 finite forms and both parameterized families are implemented in core. A noble polyhedron has one vertex orbit and one face orbit under its symmetry group. The core exposes vertices, ordered face cycles, and abstract edges separately; display pixels are derived from those cycles.

## Current generation

- Convex Platonic examples are generated from coordinate orbits and supporting planes.
- The dodecahedron is generated as the dual vertex orbit of the icosahedron.
- The small stellated dodecahedron and great dodecahedron use the five-vertex neighbor rings of the icosahedral orbit, connected at steps two and one respectively.
- The great stellated dodecahedron uses deeper five-vertex planes in the dodecahedral orbit, connected at step two. The great icosahedron uses the long-edge equilateral triangle orbit of the icosahedral vertices.
- The other 137 finite forms use octahedral or icosahedral Coxeter-group actions on a generating point and one independently recovered face cycle. The group generates all vertices and faces; complete meshes are not stored. See [the catalogue notes](../packages/core/CATALOGUE.md) for the numerical faceting search and provenance.
- Disphenoids use three positive axis lengths.
- Stephanoids use Hill's `PC(n,p,q)` and `AC(n,p,q)` generating quadrilaterals, then symmetry translates. The admissibility inequalities and common-factor exclusion are enforced.

## Rendering conventions

Many noble faces self-cross and many polyhedra have intersecting surfaces. The renderer projects each planar face and evaluates even-odd containment per pixel. A depth buffer resolves the closest face at each pixel. It uses two-sided lighting. The shaded edge view shows visible abstract edges; the wireframe views show all edges; face studies display one of the repeated congruent faces. Antialiasing comes from twofold supersampling. This produces a useful visual interpretation without claiming that a self-crossing face has a unique mathematical interior.

## Catalogue validation and limits

Each finite entry is checked for the published V/E/F counts, coplanarity, a common vertex sphere, two-face edge incidence, and a single connected vertex figure. A separate Node script reconstructs every stored face seed from the vertex orbit and plane-adjacency search. The tests are numerical checks of the implemented realizations; the claim that these exhaust all forms rests on Hill's classification.

Nine familiar solids have descriptive API names. Eleven other forms use descriptive IDs because several facetings have the same inradius, while Hill assigns their final suffix by the order of discovery in the original enumeration. `CATALOGUE_ID_CANDIDATES` records possible paper IDs for those forms. The implementation also corrects three Appendix B approximate coordinates using the paper's own minimal polynomials; details and a likely face-type typo are documented in [the catalogue notes](../packages/core/CATALOGUE.md). No GPL source code or model files were used to construct these entries.

Reference: [Connor Hill, *The complete set of noble polyhedra*](https://arxiv.org/pdf/2607.28711), especially §§2–4 and Appendices A–B.
