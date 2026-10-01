export const MAX_FILE_MB = 4;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_DATA_ROWS = 8000;

export function fileTooLargeMessage(label: string): string {
  return `${label} is larger than ${MAX_FILE_MB} MB, so it was not read and was not uploaded.`;
}

export function tooManyRowsMessage(label: string): string {
  return `${label} has more than ${MAX_DATA_ROWS.toLocaleString("en-US")} data rows. The comparison was refused. The file was not uploaded.`;
}
