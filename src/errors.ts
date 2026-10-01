export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_FAILURE =
  "The comparison could not be finished. Check that both files are .xlsx, .xls, or .csv exports and try again.";

export function messageOf(error: unknown): string {
  if (error instanceof Error && error.name === "UserFacingError") return error.message;
  return GENERIC_FAILURE;
}

export function rowPhrase(rows: number[]): string {
  const unique = [...new Set(rows)].sort((a, b) => a - b);
  const shown = unique.slice(0, 8);
  const more = unique.length - shown.length;
  const body = more > 0 ? `${shown.join(", ")}, and ${more} more` : shown.join(", ");
  return unique.length === 1 ? `row ${body}` : `rows ${body}`;
}
