
      extern printf(fmt: string, ...);

      struct Box<T> { value: T, }

      frame make_box<T>(v: T) ret Box<T> {
          local b: Box<T>;
          b.value = v;
          return b;
      }

      frame main() {
          local inner: Box<int> = make_box<int>(42);
          local outer: Box<Box<int>> = make_box<Box<int>>(inner);

          printf("%d\n", outer.value.value);
      }
    