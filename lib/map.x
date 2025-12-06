import malloc, realloc from "libc";
import [Array] from "./array.x";

export [Map];

struct Map<K, V> {
    keys: Array<K>,
    values: Array<V>,

    frame put(key: K, value: V) {
        # Check if key already exists and update its value
        local i: u64 = 0;
        loop {
            if i >= this.keys.length {
                break;
            }
            if this.keys.data[i] == key {
                # Key exists, update value
                this.values.data[i] = value;
                return;
            }
            i = i + 1;
        }
        # Key doesn't exist, add new entry
        call this.keys.push(key);
        call this.values.push(value);
    }

    frame get(key: K) ret V {
        local i: u64 = 0;
        loop {
            if i >= this.keys.length {
                break;
            }
            if this.keys.data[i] == key {
                return this.values.data[i];
            }
            i = i + 1;
        }
        # Key not found, return default value
        local v: V;
        return v;
    }

    frame has(key: K) ret u8 {
        local i: u64 = 0;
        loop {
            if i >= this.keys.length {
                break;
            }
            if this.keys.data[i] == key {
                return 1;
            }
            i = i + 1;
        }
        return 0;
    }

    frame delete(key: K) ret u8 {
        local i: u64 = 0;
        loop {
            if i >= this.keys.length {
                break;
            }
            if this.keys.data[i] == key {
                # Found the key, remove it by shifting remaining elements
                local j: u64 = i;
                loop {
                    if j >= this.keys.length - 1 {
                        break;
                    }
                    this.keys.data[j] = this.keys.data[j + 1];
                    this.values.data[j] = this.values.data[j + 1];
                    j = j + 1;
                }
                this.keys.length = this.keys.length - 1;
                this.values.length = this.values.length - 1;
                return 1; # Successfully deleted
            }
            i = i + 1;
        }
        return 0; # Key not found
    }

    frame size() ret u64 {
        return call this.keys.len();
    }

    frame clear() {
        call this.keys.clear();
        call this.values.clear();
    }
}
