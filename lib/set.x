import [Array] from './array.x';
import printf from 'libc';

struct Set<K, V> {
    keys: Array<K>,
    values: Array<V>,

    frame put(key: K, value: V) {
        local idx: i64 = call this.keys.indexOf(key);
        if idx != -1 {
            call this.values.set(idx, value);
        } else {
            call this.keys.push(key);
            call this.values.push(value);
        }
    }

    frame get(key: K) ret V {
        local idx: i64 = call this.keys.indexOf(key);
        if idx != -1 {
            return call this.values.get(idx);
        }
        local v: V;
        return v;
    }

    frame contains(key: K) ret u8 {
        local idx: i64 = call this.keys.indexOf(key);
        if idx != -1 {
            return 1;
        }
        return 0;
    }

    frame remove(key: K) {
        local idx: i64 = call this.keys.indexOf(key);
        if idx != -1 {
            call this.keys.removeAt(idx);
            call this.values.removeAt(idx);
        }
    }

    frame size() ret u64 {
        return call this.keys.len();
    }
}

export [Set];
