export function sanitizeNextURL(url: string) {
  const lowerURL = url.toLowerCase();
  const knownPaths = ["/dashboard"];
  if (knownPaths.includes(lowerURL)) {
    return lowerURL;
  }
  return "/dashboard";
}

function isIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number(part);
    return (
      !Number.isNaN(num) && num >= 0 && num <= 255 && part === num.toString()
    );
  });
}

function normalizeIPv6(ip: string): string[] | null {
  const ipv4Part = ip.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/);
  let address = ip;
  if (ipv4Part) {
    const ipv4Str = ipv4Part[0];
    const parts = ipv4Str.split(".").map(Number);
    if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
    const hex1 = ((parts[0] << 8) + parts[1]).toString(16);
    const hex2 = ((parts[2] << 8) + parts[3]).toString(16);
    address = address.replace(ipv4Str, `${hex1}:${hex2}`);
  }

  const mainParts = address.split("::");
  if (mainParts.length > 2) return null;

  let left = mainParts[0] ? mainParts[0].split(":") : [];
  let right = mainParts[1] ? mainParts[1].split(":") : [];

  left = left.filter((x) => x !== "");
  right = right.filter((x) => x !== "");

  const missingCount = 8 - (left.length + right.length);
  if (missingCount < 0) return null;

  if (mainParts.length === 1 && missingCount !== 0) return null;

  const middle = Array(missingCount).fill("0");
  const full = [...left, ...middle, ...right];

  if (full.length !== 8) return null;

  for (const block of full) {
    if (block.length > 4) return null;
    if (!/^[0-9a-fA-F]*$/.test(block)) return null;
  }

  return full.map((block) => block.padStart(4, "0"));
}

export function isPrivateIp(ip: string): boolean {
  if (ip.toLowerCase() === "localhost") return true;

  if (isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [p1, p2] = parts;
    if (p1 === 127) return true;
    if (p1 === 10) return true;
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
    if (p1 === 192 && p2 === 168) return true;
    if (p1 === 169 && p2 === 254) return true;
    if (p1 === 0) return true;
    return false;
  }

  const normalized = normalizeIPv6(ip);
  if (normalized) {
    const ipv4Match = ip.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/);
    if (ipv4Match) {
      return isPrivateIp(ipv4Match[0]);
    }

    const firstWord = parseInt(normalized[0], 16);

    const allZeroExceptLast = normalized
      .slice(0, 7)
      .every((block) => parseInt(block, 16) === 0);
    if (allZeroExceptLast) {
      const lastWord = parseInt(normalized[7], 16);
      if (lastWord === 0 || lastWord === 1) return true;
    }

    if ((firstWord & 0xfe00) === 0xfc00) return true;
    if ((firstWord & 0xffc0) === 0xfe80) return true;
  }

  return false;
}
