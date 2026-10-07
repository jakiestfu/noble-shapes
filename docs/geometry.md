# Geometry model and catalogue roadmap

Hill's 2026 classification establishes 146 finite nonprismatic noble polyhedra up to similarity, plus the disphenoid and stephanoid families under the paper's definition. A noble polyhedron has one vertex orbit and one face orbit under its symmetry group. The core therefore stores vertices, ordered face cycles, and abstract edges as separate data; display pixels are derived from those cycles.

## Current generation

- Convex Platonic examples are generated from coordinate orbits and supporting planes.
- The dodecahedron is generated as the dual vertex orbit of the icosahedron.
- The small stellated dodecahedron and great dodecahedron use the five-vertex neighbor rings of the icosahedral orbit, connected at steps two and one respectively.
- The great stellated dodecahedron uses deeper five-vertex planes in the dodecahedral orbit, connected at step two. The great icosahedron uses the long-edge equilateral triangle orbit of the icosahedral vertices.
- Disphenoids use three positive axis lengths.
- Stephanoids use Hill's `PC(n,p,q)` and `AC(n,p,q)` generating quadrilaterals, then symmetry translates. The admissibility inequalities and common-factor exclusion are enforced.

## Rendering conventions

Many noble faces self-cross and many polyhedra have intersecting surfaces. The renderer projects each planar face and evaluates even-odd containment per pixel. A depth buffer resolves the closest face at each pixel. It uses two-sided lighting. The shaded edge view shows visible abstract edges; the wireframe views show all edges; face studies display one of the repeated congruent faces. Antialiasing comes from twofold supersampling. This produces a useful visual interpretation without claiming that a self-crossing face has a unique mathematical interior.

## Expanding to the 146

1. Implement reusable tetrahedral, octahedral, and icosahedral point-group actions, including rotations and reflections.
2. Represent each orbit type by its generator parameters and constraints. Evaluate the algebraic parameter roots described in the paper, keeping precision and tolerance explicit.
3. Derive and record a compact generating face cycle for each catalogue entry, then generate its orbit with the relevant group. The 146 examples require distinct descriptors even with shared group machinery.
4. Validate each entry's vertex, edge, and face counts against Appendix A; verify coplanarity, two-face edge incidence, connectedness, vertex transitivity, and face transitivity.
5. Add comparison images and independent numerical checks against published figures, while keeping GPL source code and model files out of this MIT package.
6. Add export styles such as SVG only after visibility and self-crossing semantics are specified for that style.

Reference: [Connor Hill, *The complete set of noble polyhedra*](https://arxiv.org/pdf/2607.28711), especially §§2–4 and Appendices A–B.
