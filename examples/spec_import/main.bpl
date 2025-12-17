import [Disposable], [User] from "./defs.bpl";

frame process(d: *Disposable) {
    d.destroy();
}

frame main() {
    local u: User = User { name: "test" };
    process(&u);
}
