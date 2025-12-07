import [Console] from "std/io.x";

struct Entity {
    id: i32,

    frame initEntity(id: i32) {
        this.id = id;
    }

    frame describe() {
        call Console.log("Entity(id=", this.id, ")");
    }
}

struct Player: Entity {
    level: i32,

    frame initPlayer(id: i32, level: i32) {
        this.id = id;
        this.level = level;
    }

    frame describe() {
        # Override

        call Console.log("Player(id=", this.id, ", level=", this.level, ")");
    }

    frame levelUp() {
        this.level = this.level + 1;
        call Console.log("Player leveled up to ", this.level);
    }
}

struct SuperPlayer: Player {
    power: i32,

    frame initSuper(id: i32, level: i32, power: i32) {
        this.id = id;
        this.level = level;
        this.power = power;
    }

    frame describe() {
        # Override

        call Console.log("SuperPlayer(id=", this.id, ", level=", this.level, ", power=", this.power, ")");
    }

    frame usePower() {
        call Console.log("SuperPlayer uses power ", this.power, "!");
    }
}

frame main() {
    local e: Entity;
    call e.initEntity(1);
    call e.describe();

    local p: Player;
    call p.initPlayer(2, 10);
    call p.describe();
    call p.levelUp();

    local s: SuperPlayer;
    call s.initSuper(3, 99, 9000);
    call s.describe();
    call s.levelUp(); # Inherited from Player
    call s.usePower();
}
