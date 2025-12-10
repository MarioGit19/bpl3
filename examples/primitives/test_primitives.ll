@.str.0 = private unnamed_addr constant [6 x i8] c"a=%d\0A\00", align 1
@.str.1 = private unnamed_addr constant [6 x i8] c"b=%d\0A\00", align 1
@.str.2 = private unnamed_addr constant [6 x i8] c"c=%d\0A\00", align 1
@.str.3 = private unnamed_addr constant [6 x i8] c"d=%d\0A\00", align 1
@.str.4 = private unnamed_addr constant [6 x i8] c"e=%d\0A\00", align 1
@.str.5 = private unnamed_addr constant [6 x i8] c"f=%d\0A\00", align 1
@.str.6 = private unnamed_addr constant [7 x i8] c"g=%ld\0A\00", align 1
@.str.7 = private unnamed_addr constant [7 x i8] c"h=%lu\0A\00", align 1
@.str.8 = private unnamed_addr constant [8 x i8] c"neg=%d\0A\00", align 1
@.str.9 = private unnamed_addr constant [9 x i8] c"uneg=%d\0A\00", align 1
@.str.10 = private unnamed_addr constant [7 x i8] c"n=%ld\0A\00", align 1
@.str.11 = private unnamed_addr constant [6 x i8] c"o=%d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

define i32 @main() {
entry:
  %a_ptr = alloca i8
  %0 = trunc i32 10 to i8
  store i8 %0, i8* %a_ptr
  %b_ptr = alloca i8
  %1 = trunc i32 20 to i8
  store i8 %1, i8* %b_ptr
  %c_ptr = alloca i16
  %2 = trunc i32 300 to i16
  store i16 %2, i16* %c_ptr
  %d_ptr = alloca i16
  %3 = trunc i32 400 to i16
  store i16 %3, i16* %d_ptr
  %e_ptr = alloca i32
  store i32 50000, i32* %e_ptr
  %f_ptr = alloca i32
  store i32 60000, i32* %f_ptr
  %g_ptr = alloca i64
  store i64 7000000000, i64* %g_ptr
  %h_ptr = alloca i64
  store i64 8000000000, i64* %h_ptr
  %i_ptr = alloca i32
  %8 = load i8, i8* %a_ptr
  %9 = sext i8 %8 to i32
  store i32 %9, i32* %i_ptr
  %j_ptr = alloca i64
  %11 = load i32, i32* %e_ptr
  %12 = sext i32 %11 to i64
  store i64 %12, i64* %j_ptr
  %k_ptr = alloca i16
  %14 = load i16, i16* %c_ptr
  store i16 %14, i16* %k_ptr
  %l_ptr = alloca i8
  %17 = load i8, i8* %a_ptr
  store i8 %17, i8* %l_ptr
  %m_ptr = alloca i32
  %20 = load i32, i32* %e_ptr
  %21 = add i32 %20, 100
  store i32 %21, i32* %m_ptr
  %24 = load i8, i8* %a_ptr
  %25 = sext i8 %24 to i32
  %26 = call i32 @printf(i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.0, i64 0, i64 0), i32 %25)
  %28 = load i8, i8* %b_ptr
  %29 = zext i8 %28 to i32
  %30 = call i32 @printf(i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.1, i64 0, i64 0), i32 %29)
  %32 = load i16, i16* %c_ptr
  %33 = sext i16 %32 to i32
  %34 = call i32 @printf(i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.2, i64 0, i64 0), i32 %33)
  %36 = load i16, i16* %d_ptr
  %37 = zext i16 %36 to i32
  %38 = call i32 @printf(i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.3, i64 0, i64 0), i32 %37)
  %40 = load i32, i32* %e_ptr
  %41 = call i32 @printf(i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.4, i64 0, i64 0), i32 %40)
  %43 = load i32, i32* %f_ptr
  %45 = call i32 @printf(i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.5, i64 0, i64 0), i32 %43)
  %47 = load i64, i64* %g_ptr
  %48 = call i32 @printf(i8* getelementptr inbounds ([7 x i8], [7 x i8]* @.str.6, i64 0, i64 0), i64 %47)
  %50 = load i64, i64* %h_ptr
  %51 = call i32 @printf(i8* getelementptr inbounds ([7 x i8], [7 x i8]* @.str.7, i64 0, i64 0), i64 %50)
  %neg_ptr = alloca i8
  %52 = sub i32 0, 10
  %53 = trunc i32 %52 to i8
  store i8 %53, i8* %neg_ptr
  %neg_int_ptr = alloca i32
  %54 = load i8, i8* %neg_ptr
  %55 = sext i8 %54 to i32
  store i32 %55, i32* %neg_int_ptr
  %58 = load i32, i32* %neg_int_ptr
  %59 = call i32 @printf(i8* getelementptr inbounds ([8 x i8], [8 x i8]* @.str.8, i64 0, i64 0), i32 %58)
  %uneg_ptr = alloca i8
  %60 = trunc i32 250 to i8
  store i8 %60, i8* %uneg_ptr
  %uneg_int_ptr = alloca i32
  %61 = load i8, i8* %uneg_ptr
  %62 = zext i8 %61 to i32
  store i32 %62, i32* %uneg_int_ptr
  %65 = load i32, i32* %uneg_int_ptr
  %66 = call i32 @printf(i8* getelementptr inbounds ([9 x i8], [9 x i8]* @.str.9, i64 0, i64 0), i32 %65)
  %n_ptr = alloca i64
  %67 = load i32, i32* %e_ptr
  %68 = sext i32 %67 to i64
  store i64 %68, i64* %n_ptr
  %70 = load i64, i64* %n_ptr
  %71 = call i32 @printf(i8* getelementptr inbounds ([7 x i8], [7 x i8]* @.str.10, i64 0, i64 0), i64 %70)
  %o_ptr = alloca i32
  %72 = load i8, i8* %a_ptr
  %73 = sext i8 %72 to i32
  store i32 %73, i32* %o_ptr
  %75 = load i32, i32* %o_ptr
  %76 = call i32 @printf(i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.11, i64 0, i64 0), i32 %75)
  ret i32 0
}

declare i32 @printf(i8*, ...)
