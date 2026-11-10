/**
 * Hand-off for the scan flow. Photos are too big for route params, so the add screen
 * stashes the prepared request here and the analyze screen picks it up.
 */
export type PendingScan = {
  date: string;
  imageBase64?: string;
  previewUri?: string;
  thumb?: string;
  description?: string;
};

let pending: PendingScan | null = null;

export function setPendingScan(p: PendingScan) {
  pending = p;
}

export function getPendingScan(): PendingScan | null {
  return pending;
}
