import [Console] from "std/io.x";

struct User {
    name: *u8,
    age: i32,

    frame sayHello() {
        call Console.log("Hello, my name is ", this.name, " and I am ", this.age, " years old");
    }

    frame setAge(newAge: i32) {
        this.age = newAge;
    }

    frame isAdult() ret i8 {
        if this.age >= 18 {
            return 1;
        }
        return 0;
    }
}

frame main() ret i32 {
    local user: User;
    user.name = "Alice";
    user.age = 25;

    call user.sayHello();

    call user.setAge(30);
    call Console.print("After setAge: ");
    call user.sayHello();

    local adult: i8 = call user.isAdult();
    if adult {
        call Console.log("User is an adult");
    } else {
        call Console.log("User is not an adult");
    }

    return 0;
}
