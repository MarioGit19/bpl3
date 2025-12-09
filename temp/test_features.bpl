struct Point {
    x: int,
    y: int,

    frame sum() ret int {
        return this.x + this.y;
    }
}

frame main()  {
    local p: Point;
    p.x = 10;
    p.y = 20;
    local s: int = p.sum();
    
    local arr: int[5];
    arr[0] = s;
    local val: int = arr[0];
}
