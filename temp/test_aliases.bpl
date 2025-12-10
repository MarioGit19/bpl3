extern printf(fmt: string, ...);

type ID = int;
type UserID = ID;

struct Point {
  x: int,
  y: int,
}

type Point2D = Point;

frame process(p: Point2D, id: UserID) {
  printf("Point: (%d, %d), ID: %d\n", p.x, p.y, id);
}

frame main() ret int {
  local uid: UserID = 123;
  local p: Point2D = Point { x: 10, y: 20 };
  
  process(p, uid);
  
  return 0;
}
