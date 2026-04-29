const DUPLICATE_KEY_CODE = 11000;

export function isDuplicateKeyError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  return err.code === DUPLICATE_KEY_CODE;
}
