@.str.0 = private unnamed_addr constant [27 x i8] c"Process: %.2f, %.2f, %.2f\0A\00", align 1
@.str.1 = private unnamed_addr constant [24 x i8] c"Main: %.2f, %.2f, %.2f\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

%struct.Point = type { double, double, double }

define void @process(%struct.Point %p) {
entry:
  %p_ptr = alloca %struct.Point
  store %struct.Point %p, %struct.Point* %p_ptr
  %1 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 0
  %2 = load double, double* %1
  %3 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 1
  %4 = load double, double* %3
  %5 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 2
  %6 = load double, double* %5
  call void @printf(i8* getelementptr inbounds ([27 x i8], [27 x i8]* @.str.0, i64 0, i64 0), double %2, double %4, double %6)
  ret void
}

define i32 @main() {
entry:
  %p_ptr = alloca %struct.Point
  %0 = insertvalue %struct.Point undef, double 10.5, 0
  %1 = insertvalue %struct.Point %0, double 20.5, 1
  %2 = insertvalue %struct.Point %1, double 30.5, 2
  store %struct.Point %2, %struct.Point* %p_ptr
  %5 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 0
  %6 = load double, double* %5
  %7 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 1
  %8 = load double, double* %7
  %9 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 2
  %10 = load double, double* %9
  call void @printf(i8* getelementptr inbounds ([24 x i8], [24 x i8]* @.str.1, i64 0, i64 0), double %6, double %8, double %10)
  %11 = load %struct.Point, %struct.Point* %p_ptr
  call void @process(%struct.Point %11)
  ret i32 0
}
