global const EXPORTED_CONST: i32 = 42;
global exported_var: i32 = 99;

export {EXPORTED_CONST};
export {exported_var};

frame get_exported_const() ret i32 {
    return EXPORTED_CONST;
}

export get_exported_const;
