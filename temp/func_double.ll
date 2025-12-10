@.str = private unnamed_addr constant [11 x i8] c"Value: %f\0A\00", align 1

declare void @printf(i8*, ...)

define void @print_double(double %d) {
  call void @printf(i8* getelementptr inbounds ([11 x i8], [11 x i8]* @.str, i64 0, i64 0), double %d)
  ret void
}

define i32 @main() {
  call void @print_double(double 10.5)
  ret i32 0
}
