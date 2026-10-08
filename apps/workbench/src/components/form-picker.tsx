import { useEffect, useState } from "react";
import { SHAPES, type ShapeId } from "@noble-shapes/core";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type Collection = "featured" | "finite" | "infinite";
type Symmetry = "all" | "icosahedral" | "octahedral" | "tetrahedral";
type FormOption = {
  id: ShapeId;
  label: string;
  subtitle: string;
  search: string;
  collection: "finite" | "infinite";
  symmetry: Exclude<Symmetry, "all">;
};

const FEATURED = new Set<ShapeId>([
  "tetrahedron", "cube", "octahedron", "dodecahedron", "icosahedron",
  "small-stellated-dodecahedron", "great-dodecahedron",
  "great-stellated-dodecahedron", "great-icosahedron",
]);
const OCTAHEDRAL_PREFIXES = ["tO-", "tC-", "rC-", "sC-", "gC-"];
const FORM_OPTIONS: FormOption[] = SHAPES.map(item => {
  const collection = item.family === "Finite" ? "finite" : "infinite";
  const symmetry: FormOption["symmetry"] = item.id === "tetrahedron" ? "tetrahedral"
    : item.id === "cube" || item.id === "octahedron" || OCTAHEDRAL_PREFIXES.some(prefix => item.id.startsWith(prefix))
      ? "octahedral" : "icosahedral";
  const label = item.name.includes("faceting") ? item.id : item.name;
  const subtitle = collection === "infinite" ? "Infinite family" : FEATURED.has(item.id) ? "Named solid" : `${symmetry[0]!.toUpperCase()}${symmetry.slice(1)} faceting`;
  return { id: item.id, label, subtitle, search: `${item.name} ${item.id} ${subtitle}`.toLowerCase(), collection, symmetry };
});
const COLLECTIONS: { id: Collection; label: string; count: string }[] = [
  { id: "featured", label: "Featured", count: "9" },
  { id: "finite", label: "Finite", count: "146" },
  { id: "infinite", label: "Infinite", count: "2 families" },
];
const SYMMETRIES: { id: Symmetry; label: string }[] = [
  { id: "all", label: "All" }, { id: "icosahedral", label: "Icosahedral" },
  { id: "octahedral", label: "Octahedral" }, { id: "tetrahedral", label: "Tetrahedral" },
];

export function FormPicker({ shape, onSelect }: { shape: string; onSelect: (shape: string) => void }) {
  const [collection, setCollection] = useState<Collection>("featured");
  const [symmetry, setSymmetry] = useState<Symmetry>("all");
  const [inputValue, setInputValue] = useState("");
  const selected = FORM_OPTIONS.find(item => item.id === shape) ?? FORM_OPTIONS[0]!;

  useEffect(() => {
    setCollection(FEATURED.has(selected.id) ? "featured" : selected.collection);
    setSymmetry("all");
  }, [shape]);

  const term = inputValue.trim().toLowerCase();
  const searching = term !== "" && term !== selected.label.toLowerCase();
  const visible = FORM_OPTIONS.filter(item => searching
    ? term.split(/\s+/).every(part => item.search.includes(part))
    : collection === "featured" ? FEATURED.has(item.id)
      : item.collection === collection && (collection === "infinite" || symmetry === "all" || item.symmetry === symmetry));

  return <Combobox
    items={visible}
    filter={null}
    value={selected}
    itemToStringLabel={(item: FormOption) => item.label}
    onInputValueChange={setInputValue}
    onOpenChange={open => { if (!open) setInputValue(""); }}
    onValueChange={(item: FormOption | null) => { if (item) { onSelect(item.id); setInputValue(""); } }}
    autoHighlight
  >
    <ComboboxInput aria-label="Polyhedron" placeholder="Search by name or ID…" autoComplete="off" />
    <ComboboxContent className="shape-picker-popover" aria-label="Choose a noble polyhedron">
      <div className="shape-picker-browse">
        <p className="shape-picker-heading">Browse shapes</p>
        <div className="shape-picker-collections" role="group" aria-label="Shape collection">
          {COLLECTIONS.map(option => <button key={option.id} type="button" aria-pressed={collection === option.id}
            className={cn("shape-picker-collection", collection === option.id && "is-active")}
            onClick={() => setCollection(option.id)}>
            <span>{option.label}</span><small>{option.count}</small>
          </button>)}
        </div>
        {collection === "finite" && !searching && <div className="shape-picker-symmetries" role="group" aria-label="Finite shape symmetry">
          {SYMMETRIES.map(option => <button key={option.id} type="button" aria-pressed={symmetry === option.id}
            className={cn("shape-picker-symmetry", symmetry === option.id && "is-active")}
            onClick={() => setSymmetry(option.id)}>{option.label}</button>)}
        </div>}
        {collection === "infinite" && !searching && <p className="shape-picker-note">Two families; the stephanoid has prism and antiprism variants.</p>}
      </div>
      <ComboboxEmpty>No shapes found. Try a name or paper ID.</ComboboxEmpty>
      <ComboboxList className="shape-picker-list">
        {(item: FormOption) => <ComboboxItem key={item.id} value={item}>
          <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.subtitle}</span>
        </ComboboxItem>}
      </ComboboxList>
      <p className="shape-picker-footer">{searching ? `${visible.length} matching ${visible.length === 1 ? "shape" : "shapes"} across the catalogue` : `${visible.length} shown · Search all ${SHAPES.length} entries by name or ID`}</p>
    </ComboboxContent>
  </Combobox>;
}
