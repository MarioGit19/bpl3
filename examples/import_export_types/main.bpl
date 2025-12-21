import [MyStruct] from "./type_exporter.bpl";

extern printf(fmt: *i8, ...) ret i32;
extern exit(code: i32);

frame main() {
    local s: MyStruct = MyStruct { x: 1, y: 2 };
    if (s.x != 1) {
        exit(1);
    }
    printf("Type import passed\n");
}
