@.str.0 = private unnamed_addr constant [20 x i8] c"p.x = %d, p.y = %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [22 x i8] c"p2.x = %d, p2.y = %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare i64 @printf(i8*, ...)

%struct.Point = type { i64, i64 }

define i64 @main() {
entry:
  %p_ptr = alloca %struct.Point
  %0 = insertvalue %struct.Point undef, i64 10, 0
  %1 = insertvalue %struct.Point %0, i64 20, 1
  store %struct.Point %1, %struct.Point* %p_ptr
  %2 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 0
  %3 = load i64, i64* %2
  %4 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 1
  %5 = load i64, i64* %4
  %6 = call i64 @printf(i8* getelementptr inbounds ([20 x i8], [20 x i8]* @.str.0, i64 0, i64 0), i64 %3, i64 %5)
  %p2_ptr = alloca %struct.Point
  %7 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 0
  %8 = load i64, i64* %7
  %9 = add i64 %8, 5
  %10 = insertvalue %struct.Point undef, i64 %9, 0
  %11 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 1
  %12 = load i64, i64* %11
  %13 = mul i64 %12, 5
  %14 = insertvalue %struct.Point %10, i64 %13, 1
  store %struct.Point %14, %struct.Point* %p2_ptr
  %15 = getelementptr inbounds %struct.Point, %struct.Point* %p2_ptr, i32 0, i32 0
  %16 = load i64, i64* %15
  %17 = getelementptr inbounds %struct.Point, %struct.Point* %p2_ptr, i32 0, i32 1
  %18 = load i64, i64* %17
  %19 = call i64 @printf(i8* getelementptr inbounds ([22 x i8], [22 x i8]* @.str.1, i64 0, i64 0), i64 %16, i64 %18)
  ret i64 0
}
