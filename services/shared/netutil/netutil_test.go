package netutil

import (
	"testing"
)

func TestIsPrivateOrLocalEndpoint(t *testing.T) {
	tests := []struct {
		endpoint string
		want     bool
		wantErr  bool
	}{
		// Loopback
		{"127.0.0.1", true, false},
		{"localhost", true, false},
		{"LOCALHOST", true, false},
		{"[::1]", true, false},
		{"[::1]:8080", true, false},
		{"http://localhost/", true, false},
		{"http://127.0.0.1:8080/path", true, false},

		// Private IPv4 (RFC 1918)
		{"10.0.0.1", true, false},
		{"172.16.0.1", true, false},
		{"192.168.1.100", true, false},
		{"192.168.1.100:8080", true, false},
		{"http://10.10.10.10/api", true, false},

		// Link-Local
		{"169.254.169.254", true, false},
		{"fe80::1", true, false},

		// Unspecified
		{"0.0.0.0", true, false},
		{"::", true, false},

		// Public IP / domains
		{"8.8.8.8", false, false},
		{"google.com", false, false},
		{"http://google.com/foo", false, false},
		{"8.8.8.8:53", false, false},
		{"http://8.8.8.8:80", false, false},

		// Hostnames other than localhost are considered not private/local (not resolved)
		{"invalid.localdomain.xyz", false, false},
	}

	for _, tt := range tests {
		got, err := IsPrivateOrLocalEndpoint(tt.endpoint)
		if (err != nil) != tt.wantErr {
			t.Errorf("IsPrivateOrLocalEndpoint(%q) error = %v, wantErr %v", tt.endpoint, err, tt.wantErr)
			continue
		}
		if got != tt.want {
			t.Errorf("IsPrivateOrLocalEndpoint(%q) = %v, want %v", tt.endpoint, got, tt.want)
		}
	}
}
