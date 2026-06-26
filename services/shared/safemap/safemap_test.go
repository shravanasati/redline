package safemap

import (
	"sync"
	"testing"
)

func TestSafeMapBasic(t *testing.T) {
	sm := New[string, int]()

	if sm.Len() != 0 {
		t.Errorf("expected length 0, got %d", sm.Len())
	}

	sm.Set("foo", 42)
	if sm.Len() != 1 {
		t.Errorf("expected length 1, got %d", sm.Len())
	}

	val, ok := sm.Get("foo")
	if !ok || val != 42 {
		t.Errorf("expected 42, true; got %v, %v", val, ok)
	}

	if !sm.Has("foo") {
		t.Error("expected map to have 'foo'")
	}

	if sm.Has("bar") {
		t.Error("did not expect map to have 'bar'")
	}

	// Test SetIfAbsent
	added, size := sm.SetIfAbsent("foo", 100)
	if added || size != 1 {
		t.Errorf("expected (false, 1) for duplicate SetIfAbsent, got (%v, %d)", added, size)
	}
	val, _ = sm.Get("foo")
	if val != 42 {
		t.Errorf("expected value to remain 42, got %d", val)
	}

	added, size = sm.SetIfAbsent("bar", 200)
	if !added || size != 2 {
		t.Errorf("expected (true, 2) for new SetIfAbsent, got (%v, %d)", added, size)
	}
	val, _ = sm.Get("bar")
	if val != 200 {
		t.Errorf("expected value to be 200, got %d", val)
	}

	// Test Keys and Values
	keys := sm.Keys()
	if len(keys) != 2 {
		t.Errorf("expected 2 keys, got %d", len(keys))
	}
	values := sm.Values()
	if len(values) != 2 {
		t.Errorf("expected 2 values, got %d", len(values))
	}

	// Test Delete
	sm.Delete("foo")
	if sm.Has("foo") {
		t.Error("expected 'foo' to be deleted")
	}
	if sm.Len() != 1 {
		t.Errorf("expected length 1, got %d", sm.Len())
	}

	// Test Remove
	newSize := sm.Remove("bar")
	if newSize != 0 {
		t.Errorf("expected new size 0, got %d", newSize)
	}
	if sm.Has("bar") {
		t.Error("expected 'bar' to be removed")
	}
}

func TestSafeMapConcurrency(t *testing.T) {
	sm := New[int, int]()
	const goroutines = 100
	const iterations = 1000

	var wg sync.WaitGroup
	wg.Add(goroutines * 3)

	// Writer goroutines setting values
	for i := 0; i < goroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				sm.Set(id*iterations+j, j)
			}
		}(i)
	}

	// Reader goroutines reading values
	for i := 0; i < goroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				sm.Get(id*iterations + j)
			}
		}(i)
	}

	// Writer goroutines deleting values
	for i := 0; i < goroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				sm.Delete(id*iterations + j)
			}
		}(i)
	}

	wg.Wait()
}
