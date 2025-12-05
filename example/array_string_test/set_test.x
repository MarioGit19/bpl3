import printf from 'libc';
import [Array] from '../../lib/array.x';
import [String] from '../../lib/string.x';
import [Set] from '../../lib/set.x';

# Helper to initialize string from literal
frame s_init(s: *String, literal: *u8) {
    local i: u64 = 0;
    loop {
        local c: u8 = literal[i];
        if c == 0 { break; }
        s.data[i] = c;
        i = i + 1;
    }
    s.data[i] = 0;
    s.length = i;
}

frame main() {
    # Test Set<String, Array<String>> (which is effectively a Map)
    local map: Set<String, Array<String>>;
    
    # Initialize map (arrays inside struct are not auto-initialized if they are fields of a local struct? 
    # Actually local struct fields are zero-initialized if the struct is zero-initialized.
    # But Array.length needs to be 0.
    # Since Array is a struct, and map is a struct containing Arrays.
    # map.keys.length and map.values.length should be 0 if map is zeroed.
    # Local variables are zero-initialized in BPL?
    # Let's explicitly initialize to be safe.
    map.keys.length = 0;
    map.values.length = 0;

    # Create keys
    call printf("Creating keys...\n");
    local k1: String;
    call s_init(&k1, "Fruits");
    local k2: String;
    call s_init(&k2, "Vegetables");

    # Create values (Arrays of Strings)
    call printf("Creating values...\n");
    local v1: Array<String>;
    v1.length = 0;
    local f1: String; call s_init(&f1, "Apple");
    local f2: String; call s_init(&f2, "Banana");
  call v1.push(f1);
  call v1.push(f2);
  local v2: Array<String>;
  v2.length = 0;
  local veg1: String; call s_init(&veg1, "Carrot");
  call v2.push(veg1);

    # Put into map
    call printf("Putting into map...\n");
    call map.put(k1, v1);
    call map.put(k2, v2);

    call printf("Map size: %d\n", call map.size());

    # Check contains
    # call printf("Contains Fruits: %d\n", call map.contains(k1));
    # call printf("Contains Vegetables: %d\n", call map.contains(k2));
    
    local k3: String; # call s_init(&k3, "Cars");
    # call printf("Contains Cars: %d\n", call map.contains(k3));

    # Get value
    # local gotV1: Array<String> = call map.get(k1);
    # call printf("Fruits count: %d\n", call gotV1.len());
    # local fruit0: String = call gotV1.get(0);
    # call printf("Fruit 0: %s\n", fruit0.data);

    # Update value
    local f3: String; # call s_init(&f3, "Cherry");
    # call gotV1.push(f3);
    # call map.put(k1, gotV1); # Update map with modified array

    # local gotV1Updated: Array<String> = call map.get(k1);
    # call printf("Fruits count after update: %d\n", call gotV1Updated.len());

    # Remove
    # call map.remove(k2);
    # call printf("Map size after remove: %d\n", call map.size());
    # call printf("Contains Vegetables after remove: %d\n", call map.contains(k2));
}

