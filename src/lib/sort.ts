export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };

/** First click sorts ascending, the next flips it. */
export function nextSort(current: SortState, key: string): SortState {
  return current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };
}

export function compareValues(a: string | number, b: string | number): number {
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}
