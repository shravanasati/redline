// Package netutil provides utilities for networking validations and checks.
package netutil

import (
	"net"
	"net/url"
	"strings"
)

// IsPrivateOrLocalEndpoint checks if the given endpoint hostname or IP is within a private IP range,
// is "localhost", is a link-local address, or is an unspecified address (0.0.0.0 / ::).
// It does NOT perform DNS lookup.
func IsPrivateOrLocalEndpoint(endpoint string) (bool, error) {
	host := endpoint

	// Check if it's a URL (contains "://")
	if strings.Contains(endpoint, "://") {
		u, err := url.Parse(endpoint)
		if err == nil {
			host = u.Hostname()
		}
	}

	// Remove port if present (e.g. host:port)
	if shost, _, err := net.SplitHostPort(host); err == nil {
		host = shost
	}

	// Remove brackets if IPv6 address literal (e.g. [::1])
	host = strings.Trim(host, "[]")

	// Case-insensitive check for "localhost"
	if strings.ToLower(host) == "localhost" {
		return true, nil
	}

	// Try parsing host as IP literal
	if ip := net.ParseIP(host); ip != nil {
		return isPrivateOrLocalIP(ip), nil
	}

	// Hostnames other than "localhost" are assumed to be public.
	return false, nil
}

// isPrivateOrLocalIP returns true if the IP address is private, loopback, link-local or unspecified.
func isPrivateOrLocalIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}
