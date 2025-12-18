# String operator overloading showcase

import [String] from "std/string.bpl";
extern printf(fmt: string, ...) ret int;

frame main() ret int {
    printf("=== String Operator Overloading ===\n\n");

    # Test string concatenation with +
    printf("--- String Concatenation (+) ---\n");
    local hello: String = String.new("Hello");
    local world: String = String.new(" World");
    local greeting: String = hello + world;
    printf("'%s' + '%s' = '%s'\n", hello.cstr(), world.cstr(), greeting.cstr());
    greeting.destroy();

    local first: String = String.new("BPL");
    local space: String = String.new(" ");
    local second: String = String.new("is");
    local third: String = String.new(" awesome!");
    local sentence: String = first + space + second + third;
    printf("Chained with +: '%s'\n\n", sentence.cstr());
    sentence.destroy();

    # Test in-place concatenation with <<
    printf("--- In-place Concatenation (<<) ---\n");
    local builder: String = String.new("Hello");
    printf("Initial: '%s'\n", builder.cstr());
    builder << String.new(" ");
    printf("After << ' ': '%s'\n", builder.cstr());
    builder << String.new("World");
    printf("After << 'World': '%s'\n", builder.cstr());
    builder << String.new("!");
    printf("After << '!': '%s'\n", builder.cstr());
    printf("\n");

    # String Literal Support (no String.new() needed)
    printf("--- String Literal Support ---\n");
    local lit1: String = String.new("Direct");
    local lit2: String = lit1 + " literals"; # No String.new() needed!
    printf("lit1 + \" literals\": '%s'\n", lit2.cstr());
    lit2.destroy();

    lit1 << " work"; # No String.new() needed!
    printf("lit1 after << \" work\": '%s'\n", lit1.cstr());
    lit1 << "!";
    printf("lit1 after << \"!\": '%s'\n", lit1.cstr());
    lit1.destroy();
    printf("\n");

    # Demonstrate difference: + creates new, << modifies in place
    printf("--- Difference: + vs << ---\n");
    local s1: String = String.new("Immutable");
    local s2: String = s1 + String.new(" copy");
    printf("s1 after s2 = s1 + ' copy': '%s' (unchanged)\n", s1.cstr());
    printf("s2: '%s' (new string)\n", s2.cstr());

    local s3: String = String.new("Mutable");
    s3 << String.new(" modified");
    printf("s3 after s3 << ' modified': '%s' (changed in place)\n", s3.cstr());
    printf("\n");

    s2.destroy();
    s3.destroy();

    # Test string equality with ==
    printf("--- String Equality (==) ---\n");
    local s1: String = String.new("test");
    local s2: String = String.new("test");
    local s3: String = String.new("other");

    if (s1 == s2) {
        printf("'%s' == '%s': true\n", s1.cstr(), s2.cstr());
    } else {
        printf("'%s' == '%s': false\n", s1.cstr(), s2.cstr());
    }

    if (s1 == s3) {
        printf("'%s' == '%s': true\n", s1.cstr(), s3.cstr());
    } else {
        printf("'%s' == '%s': false\n", s1.cstr(), s3.cstr());
    }
    printf("\n");

    # Test string inequality with !=
    printf("--- String Inequality (!=) ---\n");
    if (s1 != s3) {
        printf("'%s' != '%s': true\n", s1.cstr(), s3.cstr());
    } else {
        printf("'%s' != '%s': false\n", s1.cstr(), s3.cstr());
    }

    if (s1 != s2) {
        printf("'%s' != '%s': true\n", s1.cstr(), s2.cstr());
    } else {
        printf("'%s' != '%s': false\n", s1.cstr(), s2.cstr());
    }
    printf("\n");

    # Test string comparison with <, >, <=, >=
    printf("--- String Comparison (<, >, <=, >=) ---\n");
    local apple: String = String.new("apple");
    local banana: String = String.new("banana");

    if (apple < banana) {
        printf("'%s' < '%s': true\n", apple.cstr(), banana.cstr());
    } else {
        printf("'%s' < '%s': false\n", apple.cstr(), banana.cstr());
    }

    if (banana > apple) {
        printf("'%s' > '%s': true\n", banana.cstr(), apple.cstr());
    } else {
        printf("'%s' > '%s': false\n", banana.cstr(), apple.cstr());
    }

    if (apple <= banana) {
        printf("'%s' <= '%s': true\n", apple.cstr(), banana.cstr());
    } else {
        printf("'%s' <= '%s': false\n", apple.cstr(), banana.cstr());
    }

    if (banana >= apple) {
        printf("'%s' >= '%s': true\n", banana.cstr(), apple.cstr());
    } else {
        printf("'%s' >= '%s': false\n", banana.cstr(), apple.cstr());
    }
    printf("\n");

    # Test lexicographic ordering
    printf("--- Lexicographic Ordering ---\n");
    local a: String = String.new("a");
    local z: String = String.new("z");
    local aa: String = String.new("aa");

    if (a < z) {
        printf("'%s' < '%s': true\n", a.cstr(), z.cstr());
    }
    if (a < aa) {
        printf("'%s' < '%s': true\n", a.cstr(), aa.cstr());
    }
    if (z > aa) {
        printf("'%s' > '%s': true\n", z.cstr(), aa.cstr());
    }
    # Cleanup
    hello.destroy();
    world.destroy();
    first.destroy();
    space.destroy();
    second.destroy();
    third.destroy();
    builder.destroy();
    s1.destroy();
    apple.destroy();
    banana.destroy();
    a.destroy();
    z.destroy();
    aa.destroy();

    printf("\n=== All String Operator Tests Complete ===\n");
    return 0;
}
