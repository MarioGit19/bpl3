
declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

define i64 @foo() {
entry:
  br i1 1, label %then.0, label %else.1
then.0:
  ret i64 1
else.1:
  ret i64 0
merge.2:
  ret i64 0
}

define void @main() {
entry:
  %x_ptr = alloca i64
  %0 = call i64 @foo()
  store i64 %0, i64* %x_ptr
  ret void
}
