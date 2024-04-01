/**
 * This type represents a single word in the chain of words needed to solve the puzzle.
 * It contains helpers designed to find the best word for this link, and to filter the
 * search space as the chain progresses.
 */
class WordLink {
    /**
     * @param {string | null} previousWord Either null (for the first word) or the last link in the chain
     * @param {Set<string>} desiredLetters The letters we would like to use in the next word
     */
    constructor(previousWord, desiredLetters, dictionary) {
        this.words = dictionary.filter((word) => !previousWord || (word !== previousWord && word[0] === previousWord?.slice(-1) && word.split("").some((letter) => desiredLetters.has(letter))));
        // Sort the words by the number of desired letters they contain
        // Create a map to cache the number of desired letters in each word
        let desiredLetterCount = new Map();
        for (let word of this.words) {
            let uniqueDesiredLetters = new Set(word.split("").filter((letter) => desiredLetters.has(letter)));
            desiredLetterCount.set(word, uniqueDesiredLetters.size);
        }
        this.words = this.words.sort((a, b) => desiredLetterCount.get(b) - desiredLetterCount.get(a));
        this.currentWordIndex = 0;
        this.desiredLetters = desiredLetters;
    }

    /**
     * @returns {string} The current word this link represents
     */
    currentWord() {
        return this.words[this.currentWordIndex] || "";
    }

    /**
     * @returns {string | null} Discards the current word and selects the next best word for this link
     */
    nextWord() {
        this.currentWordIndex++;
        return this.currentWord();
    }

    /**
     * The idea for this function is that if the subsequent links cannot solve the
     * puzzle, then we know the last letter of the current word cannot be used in the
     * solution as it stands.
     */
    currentWordEndingIsBad() {
        let letter = this.currentWord().slice(-1);
        this.words = this.words.filter((word) => word.slice(-1) !== letter);
    }

    /**
     * @returns {Set<string>} The letters that are still needed to solve the puzzle
     */
    getLetterStillUnusedAfterThisLink() {
        return new Set([...this.desiredLetters].filter((letter) => !this.currentWord().includes(letter)));
    }

    /**
     * @returns {boolean} True if this is the last link in the chain needed to solve the puzzle
     */
    doesCurrentWordCompleteChain() {
        return this.getLetterStillUnusedAfterThisLink().size === 0;
    }
}

/**
 * This class represents the entire word chain needed to solve the puzzle.
 * It contains helpers to validate words, and to recalculate the solution as the user
 * vetoes words.
 */
class WordChain {
    constructor(challengeTriplets, dictionary) {
        this.challengeTriplets = challengeTriplets;
        this.dictionary = dictionary.filter((word) => this.isValidWord(word));
        this.rejectedWords = new Set(); // Allow the user to veto words
        this.links = [];
    }

    /**
     * @param {*} word Any string from the dictionary
     * @returns true if the word can be created from the challenge triplets as per the rules
     */
    isValidWord(word) {
        if (word.length <= 3) {
            return false;
        }
        let lastTriplet = null;
        for (let triplet of this.challengeTriplets) {
            if (triplet.includes(word[0])) {
                lastTriplet = triplet;
                break;
            }
        }
        if (lastTriplet === null) {
            return false;
        }
        for (let letter of word.slice(1)) {
            let found = false;
            for (let triplet of this.challengeTriplets) {
                if (triplet.includes(letter) && triplet !== lastTriplet) {
                    lastTriplet = triplet;
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }

    /**
     * @returns {WordLink[]} The current word chain as an array of objects that allow
     */
    getLinks() {
        return this.links;
    }

    recalculateSolution() {
        this.links = [new WordLink(null, new Set(this.challengeTriplets.join("")), this.dictionary)];
        while (this.links.length > 0) {
            let currentLink = this.links[this.links.length - 1];
            let word = currentLink.currentWord();
            while (word && this.rejectedWords.has(word)) {
                word = currentLink.nextWord();
            }
            if (!word) {
                this.links.pop();
                if (this.links.length > 0) {
                    currentLink = this.links[this.links.length - 1];
                    currentLink.currentWordEndingIsBad();
                }
            } else if (currentLink.doesCurrentWordCompleteChain()) {
                break;
            } else {
                let nextLink = new WordLink(word, currentLink.getLetterStillUnusedAfterThisLink(), this.dictionary);
                this.links.push(nextLink);
            }
        }
    }
}

// Now for the UI setup

/**
 * @param {*} letter
 * @returns true for any letter in any language
 */
function validateLetter(letter) {
    const regex = /^\p{L}$/u;
    return regex.test(letter);
}

function downloadDictionary() {
    fetch("assets/data/oxford5000.txt")
        .then((response) => response.text())
        .then((text) => {
            document.querySelector("#dictionary_input").value = text;
        });
}

function setupLetterBoxedPuzzle() {
    // Populate the inputs with letters, without repeating any letters
    let consonents = "bcdfghjklmnpqrstvwxyz";
    let vowels = "aeiou";
    function shuffleString(str) {
        let toShuffle = str.split("");
        for (let i = toShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
        }
        return toShuffle.join("");
    }
    consonents = shuffleString(consonents);
    vowels = shuffleString(vowels);
    // Ensure we have both consonents and vowels
    consonents = consonents.slice(0, 9);
    vowels = vowels.slice(0, 3);
    if (consonents.includes("q") && !vowels.includes("u")) {
        vowels = "u" + vowels.slice(0, 2);
    }
    let challengeLetters = shuffleString(consonents + vowels).split("");

    let inputs = document.querySelectorAll(".lb_cell[type='text']");
    for (let input of inputs) {
        input.value = challengeLetters.pop().toUpperCase();
        attachListener(input, "input", (event) => {
            if (!validateLetter(event.target.value)) {
                event.target.value = "";
            } else {
                event.target.value = event.target.value.toUpperCase();
            }
        });
    }
    resizeGrid();
}

function resizeGrid() {
    let grid = document.querySelector(".letter_boxed_grid");

    let gridOwner = grid.parentElement;
    let gridSize = gridOwner.clientWidth / 2;

    // if the width of the container is more than 2/3 of the screen, set width to match the parent
    if (gridOwner.clientWidth > window.innerWidth * (2 / 3)) {
        gridSize = gridOwner.clientWidth * 0.8;
    }

    grid.style.width = `${gridSize}px`;
    grid.style.height = `${gridSize}px`;

    // for each child, set the width and height to 20% of the grid size
    let cellSize = gridSize / 5;
    for (let cell of grid.children) {
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        cell.style.fontSize = `${cellSize * 0.5}px`;
    }

    // Also set the size of the example image to match our grid size
    let exampleImage = document.querySelector("#letter-boxed-example-grid");
    exampleImage.style.width = `${gridSize}px`;
    exampleImage.style.height = `${gridSize}px`;
}

function resetSolution() {
    let challengeTriplets = [];
    let inputs = document.querySelectorAll(".lb_cell[type='text']");
    for (let input of inputs) {
        challengeTriplets.push(input.value.toLowerCase());
    }
    let dictionary = document.querySelector("#dictionary_input").value.split("\n");

    solution = new WordChain(challengeTriplets, dictionary);
    solution.recalculateSolution();
    updateSolutionTable();
}

function updateSolutionTable() {
    if (!solution) {
        return;
    }

    let solutionTable = document.querySelector("#solution_table");
    solutionTable.innerHTML = "";
    let wordRow = solutionTable.insertRow();
    let buttonRow = solutionTable.insertRow();

    let links = solution.getLinks();
    if (links.length === 0) {
        let row = solutionTable.insertRow();
        let cell = row.insertCell();
        cell.textContent = "No solution found";
        return;
    }

    for (let i = 0; i < links.length; i++) {
        wordRow.insertCell().textContent = links[i].currentWord();
        let nextWordButton = document.createElement("button");
        let vetoWordButton = document.createElement("button");
        nextWordButton.textContent = "Next word";
        vetoWordButton.textContent = "Veto word";
        attachListener(nextWordButton, "click", () => {
            nextWord(i);
        });
        attachListener(vetoWordButton, "click", () => {
            vetoWord(i, links[i].currentWord());
        });
        let buttonCell = buttonRow.insertCell();
        let buttonContainer = document.createElement("div");
        buttonCell.appendChild(buttonContainer);
        // make button cell layout the vbuttons horizontally
        buttonContainer.style.display = "flex";
        buttonContainer.style.flexDirection = "row";
        buttonContainer.appendChild(nextWordButton);
        buttonContainer.appendChild(vetoWordButton);
    }
}

// Make our .letter_boxed_grid a sensible size for the screen, adjusting each time the screen is resized
attachListener(window, "resize", () => {
    resizeGrid();
});

attachListener(document, "DOMContentLoaded", () => {
    setupLetterBoxedPuzzle();
    resizeGrid();
    downloadDictionary();
    attachListener(document.querySelector("#new_puzzle_button"), "click", setupLetterBoxedPuzzle);
    attachListener(document.querySelector("#reset_solution_button"), "click", resetSolution);
    resetSolution();
});
