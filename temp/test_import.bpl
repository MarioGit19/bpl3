import [exportedFunc] from "module.bpl";

frame main() ret void {
    local x: int = exportedFunc();
}
