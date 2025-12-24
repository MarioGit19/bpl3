global const EXPORTED_CONST: int = 42;
global exportedVar: int = 99;

struct Point {
    x: int,
    y: int,
}

frame getExportedConst() ret int {
    return EXPORTED_CONST;
}

export {EXPORTED_CONST};
export {exportedVar};
export getExportedConst;
export [Point];
