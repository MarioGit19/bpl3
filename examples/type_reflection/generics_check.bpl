import [IO] from "std/io.bpl";

struct IntWrapper {
    value: int,
    frame getTypeName(this: *IntWrapper) ret string {
        return "int";
    }
}

struct FloatWrapper {
    value: float,
    frame getTypeName(this: *FloatWrapper) ret string {
        return "float";
    }
}

frame checkType<T: Type>(obj: *T) {
    local name: string = obj.getTypeName();
    if (name == "int") {
        IO.print("It is an integer wrapper\n");
    } else {
        if (name == "float") {
            IO.print("It is a float wrapper\n");
        } else {
            IO.print("Unknown type: ");
            IO.printString(name);
            IO.print("\n");
        }
    }
}

frame main() {
    local i: IntWrapper = IntWrapper { value: 42 };
    local f: FloatWrapper = FloatWrapper { value: 3.14 };

    checkType<IntWrapper>(&i);
    checkType<FloatWrapper>(&f);
}
