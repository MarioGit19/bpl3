global const EXPORTED_CONST: int = 42;
global exportedVar: int = 99;

export {EXPORTED_CONST};
export {exportedVar};

frame getExportedConst() ret int {
    return EXPORTED_CONST;
}

export getExportedConst;
