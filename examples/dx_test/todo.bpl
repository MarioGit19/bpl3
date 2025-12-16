import [Array] from "std/array.bpl";
import [String] from "std/string.bpl";

extern printf(fmt: *char, ...) ret int;
extern scanf(fmt: *char, ...) ret int;
extern malloc(size: i32) ret *void;
extern free(ptr: *void);
extern fopen(filename: *char, mode: *char) ret *void;
extern fwrite(ptr: *void, size: i32, count: i32, file: *void) ret i32;
extern fread(ptr: *void, size: i32, count: i32, file: *void) ret i32;
extern fclose(file: *void) ret int;
extern strlen(s: *char) ret i32;
extern strstr(haystack: *char, needle: *char) ret *char;

export [TODO];
struct TODO {
    id: int,
    title: String,
    description: String,
    completed: bool,
    frame new(id: int, title: String, description: String) ret TODO {
        local todo: TODO = TODO { id: id, title: title, description: description, completed: false };

        return todo;
    }

    frame updateCompleted(this: *TODO, completed: bool) {
        printf("Updating 2 completed to: %d\n", completed);
        this.completed = *&completed;
        printf("Updated completed to: %d\n", this.completed);
    }

    frame updateTitle(this: *TODO, title: String) {
        this.title.assign(title.cstr());
    }

    frame updateDescription(this: *TODO, description: String) {
        this.description.assign(description.cstr());
    }

    frame update(this: *TODO, title: String, description: String, completed: bool) {
        this.updateTitle(title);
        this.updateDescription(description);
        printf("Updating completed to: %d\n", completed);
        this.updateCompleted(completed);
    }

    frame print(this: *TODO) {
        printf("ID: %d\n", this.id);
        printf("Title: %s\n", this.title.cstr());
        printf("Description: %s\n", this.description.cstr());
        printf("Completed value: %d\n", this.completed);
        printf("Completed: %s\n", this.completed != false ? "Yes" : "No");
        printf("------------------\n");
    }
}

export [MainTODO];
struct MainTODO {
    count: int,
    items: Array<TODO>,
    currentScreen: int,
    frame new() ret MainTODO {
        local mainTodo: MainTODO = MainTODO { count: 0, items: Array<TODO>.new(0), currentScreen: 0 };

        return mainTodo;
    }

    frame addTodo(this: *MainTODO, title: String, description: String) {
        local todo: TODO = TODO.new(this.count + 1, title, description);
        this.items.push(todo);
        this.count = this.count + 1;
    }

    frame deleteTodo(this: *MainTODO, id: int) {
        local newItems: Array<TODO> = Array<TODO>.new(0);
        local i: int = 0;
        loop (i < this.items.len()) {
            local item: TODO = this.items.get(i);
            if (item.id != id) {
                newItems.push(item);
            }
            i = i + 1;
        }
        this.items.destroy();
        this.items = newItems;
    }

    frame exportToBinary(this: *MainTODO, path: *char) ret bool {
        local file: *void = fopen(path, "wb");
        if (file == cast<*void>(0)) {
            printf("Error: Could not open file for writing.\n");
            return false;
        }
        # Write magic: TODOBIN (7 bytes)
        local magic: string = "TODOBIN";
        fwrite(cast<*void>(magic), 1, 7, file);
        # Write version (4 bytes)
        local version: i32 = 1;
        fwrite(cast<*void>(&version), 4, 1, file);
        # Write count (4 bytes)
        local count32: i32 = this.count;
        fwrite(cast<*void>(&count32), 4, 1, file);
        # Write each TODO
        local i: int = 0;
        loop (i < this.items.len()) {
            local item: TODO = this.items.get(i);
            # Write id (4 bytes)
            local id32: i32 = item.id;
            fwrite(cast<*void>(&id32), 4, 1, file);
            # Write completed (1 byte)
            local completedByte: char = item.completed ? cast<char>(1) : cast<char>(0);
            fwrite(cast<*void>(&completedByte), 1, 1, file);
            # Write title length and bytes
            local titleLen: i32 = strlen(item.title.cstr());
            fwrite(cast<*void>(&titleLen), 4, 1, file);
            fwrite(cast<*void>(item.title.cstr()), 1, titleLen, file);
            # Write description length and bytes
            local descLen: i32 = strlen(item.description.cstr());
            fwrite(cast<*void>(&descLen), 4, 1, file);
            fwrite(cast<*void>(item.description.cstr()), 1, descLen, file);
            i = i + 1;
        }
        fclose(file);
        printf("=> Exported %d todos to '%s'\n", this.count, path);
        return true;
    }

    frame importFromBinary(this: *MainTODO, path: *char) ret bool {
        local file: *void = fopen(path, "rb");
        if (file == cast<*void>(0)) {
            printf("Error: File not found.\n");
            return false;
        }
        # Read and validate magic
        local magic: string = cast<string>(malloc(8));
        fread(cast<*void>(magic), 1, 7, file);
        magic[7] = '\0';
        # Read version
        local version: i32;
        fread(cast<*void>(&version), 4, 1, file);
        # Read count
        local count32: i32;
        fread(cast<*void>(&count32), 4, 1, file);
        printf("Found %d todos. Replace current %d items? (y/n): ", count32, this.count);
        local confirm: char;
        scanf(" %c", &confirm);
        if ((confirm != 'y') && (confirm != 'Y')) {
            fclose(file);
            printf("Import cancelled.\n");
            return false;
        }
        # Clear current items
        this.items.destroy();
        this.items = Array<TODO>.new(0);
        this.count = 0;
        # Read each TODO
        local i: int = 0;
        loop (i < count32) {
            local id32: i32;
            fread(cast<*void>(&id32), 4, 1, file);
            local completedByte: char;
            fread(cast<*void>(&completedByte), 1, 1, file);
            local titleLen: i32;
            fread(cast<*void>(&titleLen), 4, 1, file);
            local titleBuf: string = cast<string>(malloc(titleLen + 1));
            fread(cast<*void>(titleBuf), 1, titleLen, file);
            titleBuf[titleLen] = '\0';
            local descLen: i32;
            fread(cast<*void>(&descLen), 4, 1, file);
            local descBuf: string = cast<string>(malloc(descLen + 1));
            fread(cast<*void>(descBuf), 1, descLen, file);
            descBuf[descLen] = '\0';
            local todo: TODO = TODO.new(id32, String.new(titleBuf), String.new(descBuf));
            todo.completed = completedByte != cast<char>(0);
            this.items.push(todo);
            if (id32 > this.count) {
                this.count = id32;
            }
            i = i + 1;
        }
        fclose(file);
        printf("=> Imported %d todos from '%s'\n", count32, path);
        return true;
    }

    frame clearCompleted(this: *MainTODO) {
        local newItems: Array<TODO> = Array<TODO>.new(0);
        local i: int = 0;
        local removed: int = 0;
        loop (i < this.items.len()) {
            local item: TODO = this.items.get(i);
            if (!item.completed) {
                newItems.push(item);
            } else {
                removed = removed + 1;
            }
            i = i + 1;
        }
        this.items.destroy();
        this.items = newItems;
        printf("=> Removed %d completed todos.\n", removed);
    }

    # 0: Main Menu, 1: Add TODO, 2: View TODOs, 3: Export TODOs, 4: Import TODOs
    frame printMenu(this: *MainTODO) {
        if (this.currentScreen == 0) {
            printf("\n--- TODO Application Menu ---\n");
            printf("1. Add TODO\n");
            printf("2. View TODOs\n");
            printf("3. Export TODOs\n");
            printf("4. Import TODOs\n");
            printf("5. Exit\n");
            return;
        }
        if (this.currentScreen == 1) {
            # Don't print anything for Add TODO screen
            return;
        }
        if (this.currentScreen == 2) {
            printf("\n--- TODO List ---\n");
            local i: int = 0;
            loop (i < this.items.len()) {
                local item: TODO = this.items.get(i);
                item.print();
                i = i + 1;
            }
            printf("------------------\n");
            printf("1. Update TODO\n");
            printf("2. Delete TODO\n");
            printf("3. Back to Main Menu\n");
            printf("4. Toggle Completed\n");
            printf("5. Search TODO\n");
            printf("6. Clear Completed\n");
            return;
        }
    }

    frame readChar(this: *MainTODO) ret char {
        local buf: char;
        scanf(" %c", &buf);
        return buf;
    }

    frame readLine(this: *MainTODO, prompt: *char, bufSize: int) ret String {
        printf("%s", prompt);
        local raw: string = cast<string>(malloc(bufSize));
        scanf("%[^\n]", &raw);
        return String.new(raw);
    }

    frame handleInput(this: *MainTODO, input: char) ret bool {
        if (this.currentScreen == 0) {
            if (input == '1') {
                this.currentScreen = 1;
                local titleBuf: string = cast<string>(malloc(256));
                local descBuf: string = cast<string>(malloc(512));

                printf("Enter TODO Title: ");
                scanf("%255s", titleBuf);
                printf("Enter TODO Description: ");
                scanf("%511s", descBuf);

                this.addTodo(String.new(titleBuf), String.new(descBuf));
                printf("TODO added successfully!\n");
                this.currentScreen = 0;
                return false;
            } else if (input == '2') {
                this.currentScreen = 2;
                return false;
            } else if (input == '3') {
                this.currentScreen = 3;
                printf("\n--- Export TODOs ---\n");
                printf("Current todos: %d\n", this.count);
                printf("Enter file path: ");
                local pathBuf: string = cast<string>(malloc(512));
                scanf("%511s", pathBuf);
                this.exportToBinary(pathBuf);
                this.currentScreen = 0;
                return false;
            } else if (input == '4') {
                this.currentScreen = 4;
                printf("\n--- Import TODOs ---\n");
                printf("WARNING: This will REPLACE current todos (%d items)\n", this.count);
                printf("Enter file path: ");
                local pathBuf: string = cast<string>(malloc(512));
                scanf("%511s", pathBuf);
                this.importFromBinary(pathBuf);
                this.currentScreen = 0;
                return false;
            } else if (input == '5') {
                return true;
            } else {
                printf("Invalid option. Please try again.\n");
                return false;
            }
            return false;
        }
        if (this.currentScreen == 1) {
            # This screen is handled immediately after selecting option 1 in main menu
            return false;
        }
        if (this.currentScreen == 2) {
            if (input == '1') {
                local id: int;
                printf("Enter TODO ID to update: ");
                scanf("%d", &id);
                local titleBuf: string = cast<string>(malloc(256));
                local descBuf: string = cast<string>(malloc(512));
                local completedInt: int = 0;

                printf("Enter new Title: ");
                scanf("%255s", titleBuf);
                printf("Enter new Description: ");
                scanf("%511s", descBuf);
                printf("Is it completed? (1 for Yes, 0 for No): ");
                scanf("%d", &completedInt);
                printf("VALUE FOR COMPLETED: %d\n", completedInt);
                local completed: bool = completedInt != 0;
                printf("COMPLETED BOOL VALUE: %d\n", completed);

                local i: int = 0;
                loop (i < this.items.len()) {
                    local item: *TODO = this.items.getRef(i);
                    if (item.id == id) {
                        item.update(String.new(titleBuf), String.new(descBuf), completed);
                        break;
                    }
                    i = i + 1;
                }
                return false;
            } else if (input == '2') {
                local id: int;
                printf("Enter TODO ID to delete: ");
                scanf("%d", &id);
                this.deleteTodo(id);
                return false;
            } else if (input == '4') {
                local id: int;
                printf("Enter TODO ID to toggle completed: ");
                scanf("%d", &id);
                local i: int = 0;
                local found: bool = false;
                loop (i < this.items.len()) {
                    local item: *TODO = this.items.getRef(i);
                    if (item.id == id) {
                        item.updateCompleted(!item.completed);
                        found = true;
                        break;
                    }
                    i = i + 1;
                }
                if (!found) {
                    printf("ID not found.\n");
                }
                return false;
            } else if (input == '5') {
                local searchBuf: string = cast<string>(malloc(256));
                printf("Enter search term: ");
                scanf("%255s", searchBuf);
                printf("\n--- Search Results ---\n");
                local found: int = 0;
                local i: int = 0;
                loop (i < this.items.len()) {
                    local item: TODO = this.items.get(i);
                    local titleMatch: *char = strstr(item.title.cstr(), searchBuf);
                    local descMatch: *char = strstr(item.description.cstr(), searchBuf);
                    if ((titleMatch != cast<*char>(0)) || (descMatch != cast<*char>(0))) {
                        item.print();
                        found = found + 1;
                    }
                    i = i + 1;
                }
                if (found == 0) {
                    printf("No matching todos found.\n");
                } else {
                    printf("Found %d matching todos.\n", found);
                }
                return false;
            } else if (input == '6') {
                this.clearCompleted();
                return false;
            } else if (input == '3') {
                this.currentScreen = 0;
                return false;
            } else {
                printf("Invalid option. Please try again.\n");
                return false;
            }
        }
        return false;
    }
}
