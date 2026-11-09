export function fddReviewAllowsSigning(formKey: string, expectedId: string | null, loadedId: string | null): boolean {
  return formKey !== "item23" || (!!expectedId && expectedId === loadedId);
}