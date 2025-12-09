
declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

define void @main() {
entry:
  %x_ptr = alloca i64
  %0 = call i64 @exportedFunc()
  store i64 %0, i64* %x_ptr
  ret void
}
