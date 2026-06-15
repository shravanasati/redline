export function sanitizeNextURL(url: string) {
  const lowerURL = url.toLowerCase();
  const knownPaths = [
    "/dashboard",
  ];
  if (knownPaths.includes(lowerURL)) {
    return lowerURL;
  }
  return "/dashboard";
}
