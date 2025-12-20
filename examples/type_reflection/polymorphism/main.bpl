import [Type] from "std/type.bpl";
import [IO] from "std/io.bpl";

struct Dog {
    name: string,
    frame getTypeName(this: *Dog) ret string {
        return "Dog";
    }
}

struct Cat {
    lives: int,
    frame getTypeName(this: *Cat) ret string {
        return "Cat";
    }
}

# Use generics for polymorphism (compile-time)
frame printType<T: Type>(obj: *T) {
    IO.print("Object is a: ");
    IO.printString(obj.getTypeName());
}

frame main() {
    local d: Dog = Dog { name: "Buddy" };
    local c: Cat = Cat { lives: 9 };

    printType<Dog>(&d);
    printType<Cat>(&c);
}
