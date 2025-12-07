import [Console] from "std/io.x";

struct Animal {
    species: *u8,

    frame init(species: *u8) {
        this.species = species;
    }

    frame speak() {
        call Console.log("The ", this.species, " makes a sound.");
    }
}

struct Dog: Animal {
    breed: *u8,

    frame initDog(breed: *u8) {
        this.species = "Dog";
        this.breed = breed;
    }

    frame speak() {
        # Overrides Animal.speak

        call Console.log("The ", this.species, " (", this.breed, ") barks: Woof!");
    }
}

struct Cat: Animal {
    lives: i32,

    frame initCat() {
        this.species = "Cat";
        this.lives = 9;
    }

    frame speak() {
        # Overrides Animal.speak

        call Console.log("The ", this.species, " meows. Lives left: ", this.lives);
    }
}

frame main() {
    local genericAnimal: Animal;
    call genericAnimal.init("Unknown Animal");
    call genericAnimal.speak();

    local dog: Dog;
    call dog.initDog("Golden Retriever");
    call dog.speak();

    local cat: Cat;
    call cat.initCat();
    call cat.speak();
}
