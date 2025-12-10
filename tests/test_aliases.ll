@.str.0 = private unnamed_addr constant [25 x i8] c"Point: (%d, %d), ID: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

%struct.Point = type { i32, i32 }

define void @process(%struct.Point %p, i32 %id) {
entry:
  %p_ptr = alloca %struct.Point
  store %struct.Point %p, %struct.Point* %p_ptr
  %id_ptr = alloca i32
  store i32 %id, i32* %id_ptr
  %1 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 0
  %2 = load i32, i32* %1
  %3 = getelementptr inbounds %struct.Point, %struct.Point* %p_ptr, i32 0, i32 1
  %4 = load i32, i32* %3
  %5 = load i32, i32* %id_ptr
  call void @printf(i8* getelementptr inbounds ([25 x i8], [25 x i8]* @.str.0, i64 0, i64 0), i32 %2, i32 %4, i32 %5)
  ret void
}

define i32 @main() {
entry:
  %uid_ptr = alloca i32
  store i32 123, i32* %uid_ptr
  %p_ptr = alloca %struct.Point
  %1 = insertvalue %struct.Point undef, i32 10, 0
  %2 = insertvalue %struct.Point %1, i32 20, 1
  store %struct.Point %2, %struct.Point* %p_ptr
  %4 = load %struct.Point, %struct.Point* %p_ptr
  %6 = load i32, i32* %uid_ptr
  call void @process(%struct.Point %4, i32 %6)
  ret i32 0
}
