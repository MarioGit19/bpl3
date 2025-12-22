extern printf(fmt: string, ...);

frame main() ret int {
    printf("Before asm\n");
    asm { 
        %ignored = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([12 x i8], [12 x i8]* @.str.asm, i64 0, i64 0))
     }
    printf("After asm\n");
    return 0;
}

asm { 
@.str.asm = private unnamed_addr constant [12 x i8] c"Inside asm\0A\00", align 1
 }
