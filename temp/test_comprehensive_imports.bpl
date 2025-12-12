# Test all import scenarios
# 1. Import everything as namespace
import * as mod from "./module_a.bpl";
# 2. Import specific items
import greet, add, [Person], [Age] from "./module_a.bpl";
# 3. Import as different namespace
import * as lib from "./module_a.bpl";
frame main() {
    # Test namespace access
    local x: int = mod.add(5, 10);
    # Test direct imports
    local y: int = add(3, 7);
    # Test different namespace
    local z: int = lib.add(1, 2);
    # Test type imports
    local p1: Person;
    p1.age = 25;
    local p2: mod.Person;
    p2.age = 30;
    # Test type alias
    local a1: Age = 42;
}
