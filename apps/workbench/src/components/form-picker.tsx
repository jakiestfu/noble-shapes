import { useEffect, useState } from "react";
import { SHAPES, type ShapeId } from "@noble-polyhedra/core";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type Scope = "featured" | "icosahedral" | "octahedral" | "families" | "all" | "recent";
type FormOption = {
  id: ShapeId;
  label: string;
  subtitle: string;
  search: string;
  section: "named" | "icosahedral" | "octahedral" | "families";
};

const FEATURED = new Set<ShapeId>([
  "tetrahedron", "cube", "octahedron", "dodecahedron", "icosahedron",
  "small-stellated-dodecahedron", "great-dodecahedron",
  "great-stellated-dodecahedron", "great-icosahedron",
]);
const NAMED_ICOSAHEDRAL = new Set<ShapeId>([
  "dodecahedron", "icosahedron", "small-stellated-dodecahedron",
  "great-dodecahedron", "great-stellated-dodecahedron", "great-icosahedron",
]);
const NAMED_OCTAHEDRAL = new Set<ShapeId>(["cube", "octahedron"]);
const OCTAHEDRAL_PREFIXES = ["tO-", "tC-", "rC-", "sC-", "gC-"];
const FORM_OPTIONS: FormOption[] = [
  ...SHAPES.map(item => {
    const section: FormOption["section"] = item.family !== "Finite" ? "families"
      : FEATURED.has(item.id) ? "named"
        : OCTAHEDRAL_PREFIXES.some(prefix => item.id.startsWith(prefix)) ? "octahedral" : "icosahedral";
    const label = item.name.includes("faceting") ? item.id : item.name;
    const subtitle = section === "named" ? "Named solid" : section === "families" ? "Infinite family"
      : section === "octahedral" ? "Octahedral symmetry" : "Icosahedral symmetry";
    return { id: item.id, label, subtitle, search: `${item.name} ${item.id} ${subtitle}`.toLowerCase(), section };
  }),
];
const SCOPES: { id: Scope; label: string }[] = [
  { id: "featured", label: "Featured" }, { id: "icosahedral", label: "Icosahedral" },
  { id: "octahedral", label: "Octahedral" }, { id: "families", label: "Families" },
  { id: "all", label: "All forms" }, { id: "recent", label: "Recent" },
];

export function FormPicker({ shape, onSelect }: { shape: string; onSelect: (shape: string) => void }) {
  const [scope, setScope] = useState<Scope>("featured");
  const [recent, setRecent] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const selected = FORM_OPTIONS.find(item => item.id === shape) ?? FORM_OPTIONS[0]!;

  useEffect(() => {
    setRecent(previous => [shape, ...previous.filter(id => id !== shape)].slice(0, 6));
    setScope(selected.section === "named" ? "featured" : selected.section);
  }, [shape]);

  const inScope = (item: FormOption): boolean => scope === "all"
    || (scope === "featured" && item.section === "named")
    || (scope === "recent" && recent.includes(item.id))
    || (scope === "icosahedral" && NAMED_ICOSAHEDRAL.has(item.id as ShapeId))
    || (scope === "octahedral" && NAMED_OCTAHEDRAL.has(item.id as ShapeId))
    || item.section === scope;
  const term = inputValue.trim().toLowerCase();
  const searching = term !== "" && term !== selected.label.toLowerCase();
  const visible = FORM_OPTIONS.filter(item => searching
    ? term.split(/\s+/).every(part => item.search.includes(part)) : inScope(item));
  if (!searching && scope === "recent") visible.sort((left, right) => recent.indexOf(left.id) - recent.indexOf(right.id));

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
    <ComboboxInput aria-label="Form" placeholder="Search by name or ID…" autoComplete="off" />
    <ComboboxContent aria-label="Choose a noble polyhedron">
      <div className="border-b border-border px-2.5 pb-2.5 pt-2">
        <p className="mb-2 px-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Browse the catalogue</p>
        <div className="grid grid-cols-3 gap-1">
          {SCOPES.map(option => <button
            key={option.id}
            type="button"
            aria-pressed={scope === option.id}
            className={cn("min-w-0 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", scope === option.id && "bg-primary text-primary-foreground hover:bg-primary/85")}
            onClick={() => setScope(option.id)}
          >{option.label}</button>)}
        </div>
      </div>
      <ComboboxEmpty>No forms found. Try a name or a paper ID.</ComboboxEmpty>
      <ComboboxList>
        {(item: FormOption) => <ComboboxItem key={item.id} value={item}>
          <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.subtitle}</span>
        </ComboboxItem>}
      </ComboboxList>
      <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        {searching ? `${visible.length} matching ${visible.length === 1 ? "form" : "forms"} across the catalogue` : `${visible.length} forms · Search all ${SHAPES.length} by name or ID`}
      </p>
    </ComboboxContent>
  </Combobox>;
}
