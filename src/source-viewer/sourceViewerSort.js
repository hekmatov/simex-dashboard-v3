const numericCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function nextSourceSort(currentSort, column) {
  if (currentSort?.column !== column) {
    return { column, direction: "asc" };
  }
  if (currentSort.direction === "asc") {
    return { column, direction: "desc" };
  }
  return null;
}

export function sortSourceRows(rows, sort) {
  if (!sort?.column || !["asc", "desc"].includes(sort.direction)) return rows;
  return rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .sort((left, right) => {
      const leftValue = left.row?.[sort.column];
      const rightValue = right.row?.[sort.column];
      const leftMissing = isMissing(leftValue);
      const rightMissing = isMissing(rightValue);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (leftMissing && rightMissing) return left.sourceIndex - right.sourceIndex;

      const comparison = compareValues(leftValue, rightValue);
      if (comparison === 0) return left.sourceIndex - right.sourceIndex;
      return sort.direction === "desc" ? -comparison : comparison;
    })
    .map(({ row }) => row);
}

export function filterSourceRows(rows, columns, query) {
  const normalized = String(query ?? "").trim().toLocaleLowerCase();
  if (!normalized) return rows;
  const safeColumns = Array.isArray(columns) ? columns : [];
  return rows.filter((row) => safeColumns.some((column) => (
    String(row?.[column] ?? "").toLocaleLowerCase().includes(normalized)
  )));
}

function compareValues(left, right) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return numericCollator.compare(String(left), String(right));
}

function isMissing(value) {
  return value === null || value === undefined || value === "";
}
