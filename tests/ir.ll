@.str.0 = private unnamed_addr constant [5 x i8] c"Type\00", align 1
@.str.1 = private unnamed_addr constant [17 x i8] c"Hello from Base\0A\00", align 1
@.str.2 = private unnamed_addr constant [20 x i8] c"Hello from Derived\0A\00", align 1

%struct.Type = type { i1 }

%struct.Int = type { i32, i1 }

%struct.Bool = type { i1, i1 }

%struct.Double = type { double, i1 }

%struct.String = type { i8*, i32, i1 }

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)
declare i32 @memcmp(i8*, i8*, i64)
%struct.NullAccessError = type { i8*, i8*, i8* }
%struct.IndexOutOfBoundsError = type { i64, i64 }
%struct.DivisionByZeroError = type { i8 }
%struct.StackOverflowError = type { i8 }
%struct._IO_FILE = type opaque
@stderr = external global %struct._IO_FILE*
declare i32 @fprintf(%struct._IO_FILE*, i8*, ...)
%struct.ExceptionFrame = type { [32 x i64], %struct.ExceptionFrame* }
@exception_top = weak global %struct.ExceptionFrame* null
@exception_value = weak global i64 0
@exception_type = weak global i32 0
@__bpl_stack_depth = weak global i32 0
@__bpl_argc_value = weak global i32 0
@__bpl_argv_value = weak global i8** null
declare i32 @setjmp(i8*) returns_twice
declare void @longjmp(i8*, i32) noreturn
define linkonce_odr i32 @__bpl_argc() {
  %1 = load i32, i32* @__bpl_argc_value
  ret i32 %1
}

define linkonce_odr i8* @__bpl_argv_get(i32 %index) {
  %1 = load i8**, i8*** @__bpl_argv_value
  %2 = getelementptr i8*, i8** %1, i32 %index
  %3 = load i8*, i8** %2
  ret i8* %3
}

define linkonce_odr i1 @__bpl_mem_is_zero(i8* %ptr, i64 %n) {
entry:
  %end = getelementptr i8, i8* %ptr, i64 %n
  br label %loop
loop:
  %curr = phi i8* [ %ptr, %entry ], [ %next, %cont ]
  %done = icmp eq i8* %curr, %end
  br i1 %done, label %ret_true, label %check
check:
  %byte = load i8, i8* %curr
  %isnz = icmp ne i8 %byte, 0
  br i1 %isnz, label %ret_false, label %cont
cont:
  %next = getelementptr i8, i8* %curr, i64 1
  br label %loop
ret_true:
  ret i1 1
ret_false:
  ret i1 0
}

declare void @printf(i8*, ...)

%struct.Base = type { i8*, i1 }

@Base_vtable = constant [4 x i8*] [i8* bitcast (i8* (%struct.Type*)* @Type_getTypeName_Type_ptr to i8*), i8* bitcast (i8* (%struct.Type*)* @Type_toString_Type_ptr to i8*), i8* bitcast (void (%struct.Type*)* @Type_destroy_Type_ptr to i8*), i8* bitcast (void (%struct.Base)* @Base_greet_Base to i8*)]

%struct.Derived = type { i8*, i1 }

@Derived_vtable = constant [4 x i8*] [i8* bitcast (i8* (%struct.Type*)* @Type_getTypeName_Type_ptr to i8*), i8* bitcast (i8* (%struct.Type*)* @Type_toString_Type_ptr to i8*), i8* bitcast (void (%struct.Type*)* @Type_destroy_Type_ptr to i8*), i8* bitcast (void (%struct.Derived)* @Derived_greet_Derived to i8*)]

define linkonce_odr i8* @Type_getTypeName_Type_ptr(%struct.Type* %this) {
entry:
  %0 = load i32, i32* @__bpl_stack_depth
  %1 = add i32 %0, 1
  store i32 %1, i32* @__bpl_stack_depth
  %2 = icmp ugt i32 %1, 10000
  br i1 %2, label %stack_err.1, label %stack_ok.0
stack_err.1:
  %3 = insertvalue %struct.StackOverflowError undef, i8 0, 0
  store i32 10, i32* @exception_type
  %4 = ptrtoint %struct.StackOverflowError* null to i64
  %5 = add i64 %4, 0
  %6 = call i8* @malloc(i64 ptrtoint (%struct.StackOverflowError* getelementptr (%struct.StackOverflowError, %struct.StackOverflowError* null, i32 1) to i64))
  %7 = bitcast i8* %6 to %struct.StackOverflowError*
  store %struct.StackOverflowError %3, %struct.StackOverflowError* %7
  %8 = ptrtoint %struct.StackOverflowError* %7 to i64
  store i64 %8, i64* @exception_value
  %9 = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top
  %10 = icmp eq %struct.ExceptionFrame* %9, null
  br i1 %10, label %throw.abort.2, label %throw.jump.3
throw.abort.2:
  call void @exit(i32 1)
  unreachable
throw.jump.3:
  %11 = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* %9, i32 0, i32 0
  %12 = bitcast [32 x i64]* %11 to i8*
  call void @longjmp(i8* %12, i32 1)
  unreachable
stack_ok.0:
  %this_ptr.0 = alloca %struct.Type*
  store %struct.Type* %this, %struct.Type** %this_ptr.0
  %13 = load i32, i32* @__bpl_stack_depth
  %14 = sub i32 %13, 1
  store i32 %14, i32* @__bpl_stack_depth
  ret i8* getelementptr inbounds ([5 x i8], [5 x i8]* @.str.0, i64 0, i64 0)
}

define linkonce_odr i8* @Type_toString_Type_ptr(%struct.Type* %this) {
entry:
  %0 = load i32, i32* @__bpl_stack_depth
  %1 = add i32 %0, 1
  store i32 %1, i32* @__bpl_stack_depth
  %2 = icmp ugt i32 %1, 10000
  br i1 %2, label %stack_err.1, label %stack_ok.0
stack_err.1:
  %3 = insertvalue %struct.StackOverflowError undef, i8 0, 0
  store i32 10, i32* @exception_type
  %4 = ptrtoint %struct.StackOverflowError* null to i64
  %5 = add i64 %4, 0
  %6 = call i8* @malloc(i64 ptrtoint (%struct.StackOverflowError* getelementptr (%struct.StackOverflowError, %struct.StackOverflowError* null, i32 1) to i64))
  %7 = bitcast i8* %6 to %struct.StackOverflowError*
  store %struct.StackOverflowError %3, %struct.StackOverflowError* %7
  %8 = ptrtoint %struct.StackOverflowError* %7 to i64
  store i64 %8, i64* @exception_value
  %9 = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top
  %10 = icmp eq %struct.ExceptionFrame* %9, null
  br i1 %10, label %throw.abort.2, label %throw.jump.3
throw.abort.2:
  call void @exit(i32 1)
  unreachable
throw.jump.3:
  %11 = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* %9, i32 0, i32 0
  %12 = bitcast [32 x i64]* %11 to i8*
  call void @longjmp(i8* %12, i32 1)
  unreachable
stack_ok.0:
  %this_ptr.0 = alloca %struct.Type*
  store %struct.Type* %this, %struct.Type** %this_ptr.0
  %13 = load i32, i32* @__bpl_stack_depth
  %14 = sub i32 %13, 1
  store i32 %14, i32* @__bpl_stack_depth
  %15 = load %struct.Type*, %struct.Type** %this_ptr.0
  %16 = call i8* @Type_getTypeName_Type_ptr(%struct.Type* %15)
  ret i8* %16
}

define linkonce_odr void @Type_destroy_Type_ptr(%struct.Type* %this) {
entry:
  %0 = load i32, i32* @__bpl_stack_depth
  %1 = add i32 %0, 1
  store i32 %1, i32* @__bpl_stack_depth
  %2 = icmp ugt i32 %1, 10000
  br i1 %2, label %stack_err.1, label %stack_ok.0
stack_err.1:
  %3 = insertvalue %struct.StackOverflowError undef, i8 0, 0
  store i32 10, i32* @exception_type
  %4 = ptrtoint %struct.StackOverflowError* null to i64
  %5 = add i64 %4, 0
  %6 = call i8* @malloc(i64 ptrtoint (%struct.StackOverflowError* getelementptr (%struct.StackOverflowError, %struct.StackOverflowError* null, i32 1) to i64))
  %7 = bitcast i8* %6 to %struct.StackOverflowError*
  store %struct.StackOverflowError %3, %struct.StackOverflowError* %7
  %8 = ptrtoint %struct.StackOverflowError* %7 to i64
  store i64 %8, i64* @exception_value
  %9 = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top
  %10 = icmp eq %struct.ExceptionFrame* %9, null
  br i1 %10, label %throw.abort.2, label %throw.jump.3
throw.abort.2:
  call void @exit(i32 1)
  unreachable
throw.jump.3:
  %11 = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* %9, i32 0, i32 0
  %12 = bitcast [32 x i64]* %11 to i8*
  call void @longjmp(i8* %12, i32 1)
  unreachable
stack_ok.0:
  %this_ptr.0 = alloca %struct.Type*
  store %struct.Type* %this, %struct.Type** %this_ptr.0
  %13 = load i32, i32* @__bpl_stack_depth
  %14 = sub i32 %13, 1
  store i32 %14, i32* @__bpl_stack_depth
  ret void
}

define void @Base_greet_Base(%struct.Base %this) {
entry:
  %0 = load i32, i32* @__bpl_stack_depth
  %1 = add i32 %0, 1
  store i32 %1, i32* @__bpl_stack_depth
  %2 = icmp ugt i32 %1, 10000
  br i1 %2, label %stack_err.1, label %stack_ok.0
stack_err.1:
  %3 = insertvalue %struct.StackOverflowError undef, i8 0, 0
  store i32 10, i32* @exception_type
  %4 = ptrtoint %struct.StackOverflowError* null to i64
  %5 = add i64 %4, 0
  %6 = call i8* @malloc(i64 ptrtoint (%struct.StackOverflowError* getelementptr (%struct.StackOverflowError, %struct.StackOverflowError* null, i32 1) to i64))
  %7 = bitcast i8* %6 to %struct.StackOverflowError*
  store %struct.StackOverflowError %3, %struct.StackOverflowError* %7
  %8 = ptrtoint %struct.StackOverflowError* %7 to i64
  store i64 %8, i64* @exception_value
  %9 = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top
  %10 = icmp eq %struct.ExceptionFrame* %9, null
  br i1 %10, label %throw.abort.2, label %throw.jump.3
throw.abort.2:
  call void @exit(i32 1)
  unreachable
throw.jump.3:
  %11 = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* %9, i32 0, i32 0
  %12 = bitcast [32 x i64]* %11 to i8*
  call void @longjmp(i8* %12, i32 1)
  unreachable
stack_ok.0:
  %this_ptr.0 = alloca %struct.Base
  %this_null.1 = alloca i1
  store i1 1, i1* %this_null.1
  store %struct.Base %this, %struct.Base* %this_ptr.0
  %13 = load %struct.Base, %struct.Base* %this_ptr.0
  %14 = extractvalue %struct.Base %13, 1
  store i1 %14, i1* %this_null.1
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([17 x i8], [17 x i8]* @.str.1, i64 0, i64 0))
  %15 = load i32, i32* @__bpl_stack_depth
  %16 = sub i32 %15, 1
  store i32 %16, i32* @__bpl_stack_depth
  ret void
}

define void @Derived_greet_Derived(%struct.Derived %this) {
entry:
  %0 = load i32, i32* @__bpl_stack_depth
  %1 = add i32 %0, 1
  store i32 %1, i32* @__bpl_stack_depth
  %2 = icmp ugt i32 %1, 10000
  br i1 %2, label %stack_err.1, label %stack_ok.0
stack_err.1:
  %3 = insertvalue %struct.StackOverflowError undef, i8 0, 0
  store i32 10, i32* @exception_type
  %4 = ptrtoint %struct.StackOverflowError* null to i64
  %5 = add i64 %4, 0
  %6 = call i8* @malloc(i64 ptrtoint (%struct.StackOverflowError* getelementptr (%struct.StackOverflowError, %struct.StackOverflowError* null, i32 1) to i64))
  %7 = bitcast i8* %6 to %struct.StackOverflowError*
  store %struct.StackOverflowError %3, %struct.StackOverflowError* %7
  %8 = ptrtoint %struct.StackOverflowError* %7 to i64
  store i64 %8, i64* @exception_value
  %9 = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top
  %10 = icmp eq %struct.ExceptionFrame* %9, null
  br i1 %10, label %throw.abort.2, label %throw.jump.3
throw.abort.2:
  call void @exit(i32 1)
  unreachable
throw.jump.3:
  %11 = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* %9, i32 0, i32 0
  %12 = bitcast [32 x i64]* %11 to i8*
  call void @longjmp(i8* %12, i32 1)
  unreachable
stack_ok.0:
  %this_ptr.0 = alloca %struct.Derived
  %this_null.1 = alloca i1
  store i1 1, i1* %this_null.1
  store %struct.Derived %this, %struct.Derived* %this_ptr.0
  %13 = load %struct.Derived, %struct.Derived* %this_ptr.0
  %14 = extractvalue %struct.Derived %13, 1
  store i1 %14, i1* %this_null.1
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([20 x i8], [20 x i8]* @.str.2, i64 0, i64 0))
  %15 = load i32, i32* @__bpl_stack_depth
  %16 = sub i32 %15, 1
  store i32 %16, i32* @__bpl_stack_depth
  ret void
}

define i32 @main(i32 %argc, i8** %argv) {
entry:
  %0 = load i32, i32* @__bpl_stack_depth
  %1 = add i32 %0, 1
  store i32 %1, i32* @__bpl_stack_depth
  %2 = icmp ugt i32 %1, 10000
  br i1 %2, label %stack_err.1, label %stack_ok.0
stack_err.1:
  %3 = insertvalue %struct.StackOverflowError undef, i8 0, 0
  store i32 10, i32* @exception_type
  %4 = ptrtoint %struct.StackOverflowError* null to i64
  %5 = add i64 %4, 0
  %6 = call i8* @malloc(i64 ptrtoint (%struct.StackOverflowError* getelementptr (%struct.StackOverflowError, %struct.StackOverflowError* null, i32 1) to i64))
  %7 = bitcast i8* %6 to %struct.StackOverflowError*
  store %struct.StackOverflowError %3, %struct.StackOverflowError* %7
  %8 = ptrtoint %struct.StackOverflowError* %7 to i64
  store i64 %8, i64* @exception_value
  %9 = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top
  %10 = icmp eq %struct.ExceptionFrame* %9, null
  br i1 %10, label %throw.abort.2, label %throw.jump.3
throw.abort.2:
  call void @exit(i32 1)
  unreachable
throw.jump.3:
  %11 = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* %9, i32 0, i32 0
  %12 = bitcast [32 x i64]* %11 to i8*
  call void @longjmp(i8* %12, i32 1)
  unreachable
stack_ok.0:
  store i32 %argc, i32* @__bpl_argc_value
  store i8** %argv, i8*** @__bpl_argv_value
  %d_ptr.0 = alloca %struct.Derived
  %d_null.1 = alloca i1
  store i1 1, i1* %d_null.1
  %13 = insertvalue %struct.Derived undef, i8* bitcast ([4 x i8*]* @Derived_vtable to i8*), 0
  %14 = insertvalue %struct.Derived %13, i1 1, 1
  store %struct.Derived %14, %struct.Derived* %d_ptr.0
  %15 = getelementptr inbounds %struct.Derived, %struct.Derived* %d_ptr.0, i32 0, i32 0
  %16 = load i8*, i8** %15
  %17 = bitcast i8* %16 to i8**
  %18 = getelementptr inbounds i8*, i8** %17, i64 3
  %19 = load i8*, i8** %18
  %20 = bitcast i8* %19 to void ()*
  %21 = load %struct.Derived, %struct.Derived* %d_ptr.0
  call void %20(%struct.Derived %21)
  %22 = load i32, i32* @__bpl_stack_depth
  %23 = sub i32 %22, 1
  store i32 %23, i32* @__bpl_stack_depth
  ret i32 0
}
