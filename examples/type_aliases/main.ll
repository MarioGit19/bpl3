@.str.0 = private unnamed_addr constant [35 x i8] c"Processing Point %d: (%d, %d, %d)\0A\00", align 1
@.str.1 = private unnamed_addr constant [29 x i8] c"Main: %d (%.2f, %.2f, %.2f)\0A\00", align 1
@.str.2 = private unnamed_addr constant [13 x i8] c"User ID: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare i32 @printf(i8*, ...)

%struct.Point = type { double, double, double }

define void @process_point(%struct.Point %p, i32 %id) {
entry:
  %p_ptr = alloca %struct.Point
  store %struct.Point %p, %struct.Point* %p_ptr
  %id_ptr = alloca i32
  store i32 %id, i32* %id_ptr
  %1 = load i32, i32* %id_ptr
  %2 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 0
  %3 = load double, double* %2
  %4 = fptosi double %3 to i32
  %5 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 1
  %6 = load double, double* %5
  %7 = fptosi double %6 to i32
  %8 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 2
  %9 = load double, double* %8
  %10 = fptosi double %9 to i32
  %11 = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([35 x i8], [35 x i8]* @.str.0, i64 0, i64 0), i32 %1, i32 %4, i32 %7, i32 %10)
  ret void
}

define i32 @main() {
entry:
  %id_ptr = alloca i32
  store i32 42, i32* %id_ptr
  %p_ptr = alloca %struct.Point
  %1 = insertvalue %struct.Point undef, double 10.5, 0
  %2 = insertvalue %struct.Point %1, double 20.5, 1
  %3 = insertvalue %struct.Point %2, double 30.5, 2
  store %struct.Point %3, %struct.Point* %p_ptr
  %6 = load i32, i32* %id_ptr
  %7 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 0
  %8 = load double, double* %7
  %9 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 1
  %10 = load double, double* %9
  %11 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 2
  %12 = load double, double* %11
  %13 = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([29 x i8], [29 x i8]* @.str.1, i64 0, i64 0), i32 %6, double %8, double %10, double %12)
  %14 = load %struct.Point, %struct.Point* %p_ptr
  %16 = load i32, i32* %id_ptr
  call void @process_point(%struct.Point %14, i32 %16)
  %uid_ptr = alloca i32
  store i32 100, i32* %uid_ptr
  %20 = load i32, i32* %uid_ptr
  %21 = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([13 x i8], [13 x i8]* @.str.2, i64 0, i64 0), i32 %20)
  ret i32 0
}
