export function parseWidget(input) {
  if (input.length === 0) {
    throw new Error("empty input");
  }
  return input.trim().toUpperCase();
}
