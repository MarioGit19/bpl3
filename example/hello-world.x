global const SYS_EXIT: u8 = 67;

frame sum(a: u8, b: u8) ret u8 {
  return a + b;
}

frame pow(base: u8, exp: u8) ret u8 {
  local result: u8 = 1;
  local i: u8 = 0;

  loop {
    result = result * base;
    i += 1;
    if (i >= exp) {
      break;
    }
  }

  return result;
}

frame print_u8(num: u8){
  local copy: u8 = num;
  local digit: u8;
  loop {
    digit = copy % 10;
    call print(digit); # Convert to ASCII
    copy = copy / 10;
    if (copy == 0) {
      break;
    }
  }
}

frame main () {
  local result: u8;
  local counter: u8 = 0;
  
  result = call sum(5, 10);

  if (result == 15) {
    call print("Hello, World! 1\n");
    counter += 1;
  } 

  result = call pow(2, 3); # 2^3 = 8
  if (result == 8) {
    call print("Hello, World! 2\n");
    counter += 1;
  }

  if (counter == 2) {
    call print("All tests passed! 3\n");
  } else {
    call print("Some tests failed. 4\n");
    call exit(counter);
  }

  # call print_int(counter); # Print the number of passed tests
  call print("\n");

  call print_u8(counter);
  
  call exit(SYS_EXIT);
}

