import [MainTODO] from "./todo.bpl";

extern printf(fmt: *char, ...) ret int;

frame main() {
    printf("TODO Application Initialized\n");
    local app: MainTODO;
    app = MainTODO.new();

    local input: char = ' ';
    local shouldExit: bool = false;
    loop {
        app.printMenu();
        printf("Enter your choice: ");
        input = app.readChar();
        shouldExit = app.handleInput(input);
        if (shouldExit) {
            break;
        }
    }

    printf("Exiting TODO Application\n");
}
