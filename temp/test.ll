@.str.0 = private unnamed_addr constant [6 x i8] c"hello\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

%struct.Parent = type { %struct.V }

%struct.Child = type { %struct.T }

define i64 @foo() {
entry:
  ret i64 42
}

define void @main() {
entry:
  %y_ptr = alloca i64
  store i64 1, i64* %y_ptr
  %z_ptr = alloca i64
  %0 = call i64 @foo()
  store i64 %0, i64* %z_ptr
  %f_ptr = alloca double
  store double 1.5, double* %f_ptr
  %c_ptr = alloca i8
  store i8 0, i8* %c_ptr
  %s_ptr = alloca i8*
  store i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.0, i64 0, i64 0), i8** %s_ptr
  ret void
}
