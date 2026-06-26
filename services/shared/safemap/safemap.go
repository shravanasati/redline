package safemap

import (
	"maps"
	"slices"
	"sync"
)

// SafeMap is a generic, thread-safe map.
type SafeMap[K comparable, V any] struct {
	mu sync.RWMutex
	m  map[K]V
}

// New creates and returns a new SafeMap.
func New[K comparable, V any]() *SafeMap[K, V] {
	return &SafeMap[K, V]{
		m: make(map[K]V),
	}
}

// Get retrieves the value associated with the key.
// Returns the value and true if the key exists, otherwise the zero value and false.
func (sm *SafeMap[K, V]) Get(key K) (V, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	val, ok := sm.m[key]
	return val, ok
}

// Set associates the key with the value.
func (sm *SafeMap[K, V]) Set(key K, val V) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.m[key] = val
}

// Delete removes the key from the map.
func (sm *SafeMap[K, V]) Delete(key K) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.m, key)
}

// Remove removes the key from the map and returns the new size of the map.
func (sm *SafeMap[K, V]) Remove(key K) int {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.m, key)
	return len(sm.m)
}

// SetIfAbsent sets the key to value only if it is not already present.
// Returns true if the value was set, false if it already existed, and the new size of the map.
func (sm *SafeMap[K, V]) SetIfAbsent(key K, val V) (bool, int) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	_, ok := sm.m[key]
	if !ok {
		sm.m[key] = val
	}
	return !ok, len(sm.m)
}

// Has returns true if the key exists in the map.
func (sm *SafeMap[K, V]) Has(key K) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	_, ok := sm.m[key]
	return ok
}

// Len returns the number of elements in the map.
func (sm *SafeMap[K, V]) Len() int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return len(sm.m)
}

// Keys returns a copy of all the keys in the map.
func (sm *SafeMap[K, V]) Keys() []K {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return slices.Collect(maps.Keys(sm.m))
}

// Values returns a copy of all the values in the map.
func (sm *SafeMap[K, V]) Values() []V {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return slices.Collect(maps.Values(sm.m))
}
