global const EXPORTED_CONST: i32 = 42;
global exported_var: i32 = 99;

struct Point {
    x: i32,
    y: i32,
}

frame get_exported_const() ret i32 {
    return EXPORTED_CONST;
}

export {EXPORTED_CONST};
export {exported_var};
export get_exported_const;
export [Point];
