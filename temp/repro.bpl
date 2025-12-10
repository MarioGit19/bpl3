extern printf(fmt: string, ...);

struct Point {
  x: double,
  y: double,
  z: double,
}

frame process(p: Point) {
  printf("Process: %.2f, %.2f, %.2f\n", p.x, p.y, p.z);
}

frame main() ret int {
  local p: Point = Point {
    x: 10.5,
    y: 20.5,
    z: 30.5
  };

  printf("Main: %.2f, %.2f, %.2f\n", p.x, p.y, p.z);
  process(p);
  return 0;
}
