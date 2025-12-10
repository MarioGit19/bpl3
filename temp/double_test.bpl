extern printf(fmt: string, ...) ret int;

frame main() ret int {
  local x: double = 10.5;
  printf("Val: %.2f\n", x);
  return 0;
}
