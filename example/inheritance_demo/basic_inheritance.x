import [Console] from "std/io.x";

struct Point {
    x: i32,
    y: i32,

    frame init(x: i32, y: i32) {
        this.x = x;
        this.y = y;
    }

    frame print() {
        call Console.log("Point(", this.x, ", ", this.y, ")");
    }
}

struct Point3D: Point {
    z: i32,

    frame init3D(x: i32, y: i32, z: i32) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    frame print3D() {
        call Console.log("Point3D(", this.x, ", ", this.y, ", ", this.z, ")");
    }
}

frame main() {
    local p: Point3D;
    call p.init3D(10, 20, 30);

    call Console.log("Accessing inherited fields: x=", p.x, ", y=", p.y);
    call Console.log("Accessing own field: z=", p.z);

    call Console.log("Calling inherited method: ");
    call p.print();

    call Console.log("Calling own method: ");
    call p.print3D();
}
