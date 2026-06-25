package regionlist

import (
	"maps"
	"slices"
	"sync"
)

var _regionSingleton *RegionList = nil

// RegionList is a list of active regions.
type RegionList struct {
	regions map[string]struct{}
	mu      sync.Mutex
}

// Has method checks if the region exists in the list.
func (rl *RegionList) Has(region string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	_, ok := rl.regions[region]
	return ok
}

// Add method adds a region to the list.
// Returns true if the region was added, false if it already existed,
// and the new count of the active regions.
func (rl *RegionList) Add(region string) (bool, int) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	_, ok := rl.regions[region]
	if !ok {
		rl.regions[region] = struct{}{}
	}
	return !ok, len(rl.regions)
}

// Remove removes a region from the list, and
// returns the count of active regions.
func (rl *RegionList) Remove(region string) int {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.regions, region)
	return len(rl.regions)
}

// Count returns a count of current active regions.
func (rl *RegionList) Count() int {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	return len(rl.regions)
}

// Values returns a copy of the regions.
func (rl *RegionList) Values() []string {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	return slices.Collect(maps.Keys(rl.regions))
}

// NewRegionList returns a region list singleton.
func NewRegionList() *RegionList {
	if _regionSingleton == nil {
		_regionSingleton = &RegionList{
			regions: make(map[string]struct{}),
		}
	}
	return _regionSingleton
}
