import [GameEngine] from "./engine.bpl";
import [Vec3] from "./math.bpl";
import [EntityType] from "./entities.bpl";

global MAX_ENTITIES: int = 1000;

/#
# Main Entry Point
Initializes the game engine and starts the simulation.

## Process
1. Create Engine
2. Spawn Player
3. Start Loop
#/
frame main() ret int {
    local engine: GameEngine = GameEngine.new();

    local startPos: Vec3;
    startPos.x = 0.0;
    startPos.y = 0.0;
    startPos.z = 0.0;

    engine.spawnEntity(EntityType.Player, startPos);
    engine.start();

    return 0;
}
