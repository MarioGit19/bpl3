@.str.0 = private unnamed_addr constant [6 x i8] c"hello\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

%struct.Point = type { i64, i64 }

define i64 @add(i64 %a, i64 %b) {
entry:
  %a_ptr = alloca i64
  store i64 %a, i64* %a_ptr
  %b_ptr = alloca i64
  store i64 %b, i64* %b_ptr
  %0 = load i64, i64* %a_ptr
  %1 = load i64, i64* %b_ptr
  %2 = add i64 %0, %1
  ret i64 %2
}

define void @test_valid_types() {
entry:
  %i_ptr = alloca i64
  store i64 42, i64* %i_ptr
  %f_ptr = alloca double
  store double 3.14, double* %f_ptr
  %s_ptr = alloca i8*
  store i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.0, i64 0, i64 0), i8** %s_ptr
  %result_ptr = alloca i64
  %0 = call i64 @add(i64 10, i64 20)
  store i64 %0, i64* %result_ptr
  ret void
}

define void @test_pointer_arithmetic() {
entry:
  %ptr_ptr = alloca i64*
  store i64* 0, i64** %ptr_ptr
  %offset_ptr = alloca i64
  store i64 5, i64* %offset_ptr
  %newPtr_ptr = alloca i64*
  %0 = load i64*, i64** %ptr_ptr
  %1 = load i64, i64* %offset_ptr
  %2 = add i64* %0, %1
  store i64* %2, i64** %newPtr_ptr
  ret void
}
