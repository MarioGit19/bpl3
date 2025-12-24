import [MyStruct] from "./type_exporter.bpl";

extern printf(fmt: string, ...) ret int;
extern exit(code: int);

frame main() {
    local s: MyStruct = MyStruct { x: 1, y: 2 };
    if (s.x != 1) {
        exit(1);
    }
    printf("Type import passed\n");
}
