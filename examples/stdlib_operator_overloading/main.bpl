# Comprehensive test of operator overloading in stdlib generic types

import [Array] from "std/array.bpl";
import [Stack] from "std/stack.bpl";
import [Queue] from "std/queue.bpl";
import [Map] from "std/map.bpl";
import [Set] from "std/set.bpl";
import [Option] from "std/option.bpl";
import [Result] from "std/result.bpl";

extern printf(fmt: string, ...) ret int;

frame main() ret int {
    printf("=== Array<T> Operators ===\n");
    local arr: Array<i32> = Array<i32>.new(4);

    # Push with << operator
    arr << 10;
    arr << 20;
    arr << 30;

    printf("Array length: %d\n", arr.len());
    printf("Array[0]: %d\n", arr.get(0));
    printf("Array[1]: %d\n", arr.get(1));
    printf("Array[2]: %d\n", arr.get(2));

    # Pop with >> operator
    local popped: i32;
    arr >> &popped;
    printf("Popped value: %d\n", popped);
    printf("Array length after pop: %d\n", arr.len());

    printf("\n=== Stack<T> Operators ===\n");
    local stack: Stack<i32> = Stack<i32>.new(4);

    # Push with << operator
    stack << 100;
    stack << 200;
    stack << 300;

    printf("Stack size: %d\n", stack.size());
    local top: Option<i32> = stack.peek();
    printf("Stack top: %d\n", top.unwrap());

    printf("\n=== Queue<T> Operators ===\n");
    local queue: Queue<i32> = Queue<i32>.new(4);

    # Enqueue with << operator
    queue << 1;
    queue << 2;
    queue << 3;

    printf("Queue size: %d\n", queue.size());
    local front: Option<i32> = queue.peek();
    printf("Queue front: %d\n", front.unwrap());

    printf("\n=== Option<T> Operators ===\n");
    local opt1: Option<i32> = Option<i32>.some(42);
    local opt2: Option<i32> = Option<i32>.some(42);
    local opt3: Option<i32> = Option<i32>.none();

    if (opt1 == opt2) {
        printf("opt1 == opt2: true\n");
    } else {
        printf("opt1 == opt2: false\n");
    }

    if (opt1 != opt3) {
        printf("opt1 != opt3: true\n");
    } else {
        printf("opt1 != opt3: false\n");
    }

    printf("\n=== Result<T,E> Operators ===\n");
    local res1: Result<i32, i32> = Result<i32, i32>.Ok(100);
    local res2: Result<i32, i32> = Result<i32, i32>.Ok(100);
    local res3: Result<i32, i32> = Result<i32, i32>.Err(404);

    if (res1 == res2) {
        printf("res1 == res2: true\n");
    } else {
        printf("res1 == res2: false\n");
    }

    if (res1 != res3) {
        printf("res1 != res3: true\n");
    } else {
        printf("res1 != res3: false\n");
    }

    printf("\n=== Map<K,V> Operators ===\n");
    local map1: Map<i32, i32> = Map<i32, i32>.new(4);
    map1.set(1, 100);
    map1.set(2, 200);

    local map2: Map<i32, i32> = Map<i32, i32>.new(4);
    map2.set(1, 100);
    map2.set(2, 200);

    local map3: Map<i32, i32> = Map<i32, i32>.new(4);
    map3.set(1, 100);
    map3.set(2, 999);

    if (map1 == map2) {
        printf("map1 == map2: true\n");
    } else {
        printf("map1 == map2: false\n");
    }

    if (map1 != map3) {
        printf("map1 != map3: true\n");
    } else {
        printf("map1 != map3: false\n");
    }

    printf("\n=== Set<T> Operators ===\n");
    local set1: Set<i32> = Set<i32>.new(4);
    set1.add(1);
    set1.add(2);
    set1.add(3);

    local set2: Set<i32> = Set<i32>.new(4);
    set2.add(2);
    set2.add(3);
    set2.add(4);

    # Union with | operator
    local union_set: Set<i32> = set1 | set2;
    printf("Union size: %d\n", union_set.size());

    # Intersection with & operator
    local intersection_set: Set<i32> = set1 & set2;
    printf("Intersection size: %d\n", intersection_set.size());

    # Difference with - operator
    local diff_set: Set<i32> = set1 - set2;
    printf("Difference size: %d\n", diff_set.size());

    # Equality
    local set3: Set<i32> = Set<i32>.new(4);
    set3.add(1);
    set3.add(2);
    set3.add(3);

    if (set1 == set3) {
        printf("set1 == set3: true\n");
    } else {
        printf("set1 == set3: false\n");
    }

    # Cleanup
    arr.destroy();
    stack.destroy();
    queue.destroy();
    map1.destroy();
    map2.destroy();
    map3.destroy();
    set1.destroy();
    set2.destroy();
    union_set.destroy();
    intersection_set.destroy();
    diff_set.destroy();
    set3.destroy();

    printf("\n=== All operator overloading tests passed! ===\n");

    return 0;
}
