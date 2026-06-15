export function sanitizeNextURL(url: string) {
  const lowerURL = url.toLowerCase();
  const knownPaths = [
    "/app",
    // "/app/entries",
    // "/app/insights",
    // "/app/chat",
    // "/profile",
  ];
  if (knownPaths.includes(lowerURL)) {
    return lowerURL;
  }
  return "/app";
}
