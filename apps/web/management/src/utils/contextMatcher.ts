/**
 * Utility for matching items against the active Global vs. Hotel Management Context.
 */

export const HOTEL_CONTEXT_MAP: Record<string, { ids: string[]; names: string[] }> = {
  "soneva-fushi": {
    ids: ["MASTER_01", "soneva-fushi"],
    names: ["Soneva Fushi"],
  },
  "soneva-jani": {
    ids: ["MASTER_02", "soneva-jani"],
    names: ["Soneva Jani"],
  },
  "four-seasons": {
    ids: ["MASTER_03", "four-seasons"],
    names: ["Four Seasons", "Soneva Kiri"],
  },
  "one-and-only": {
    ids: ["MASTER_04", "one-and-only"],
    names: ["One&Only", "Constance Moofushi"],
  },
};

/**
 * Checks if a data item belongs to the selected context.
 * When selectedContext is 'global', returns true for all items.
 */
export function matchesHotelContext(
  selectedContext: string,
  item: {
    id?: string;
    deskId?: string;
    desk_id?: string;
    hotelId?: string;
    location?: string;
    name?: string;
    deskName?: string;
  } | null | undefined
): boolean {
  if (!selectedContext || selectedContext === "global") {
    return true;
  }

  if (!item) {
    return false;
  }

  const mapping = HOTEL_CONTEXT_MAP[selectedContext];
  const itemValues = [
    item.id,
    item.deskId,
    item.desk_id,
    item.hotelId,
    item.location,
    item.name,
    item.deskName,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());

  if (mapping) {
    for (const val of itemValues) {
      if (
        mapping.ids.some((id) => val.includes(id.toLowerCase())) ||
        mapping.names.some((name) => val.includes(name.toLowerCase()))
      ) {
        return true;
      }
    }
  }

  // Exact or substring fallback
  const contextLower = selectedContext.toLowerCase();
  return itemValues.some((val) => val.includes(contextLower));
}
