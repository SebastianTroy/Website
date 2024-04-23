/**
 * This type represents a single word in the chain of words needed to solve the puzzle.
 * It contains helpers designed to find the best word for this link, and to filter the
 * search space as the chain progresses.
 */
class WordLink {
    /**
     * @param {string[]} puzzleTriplets The four triplets of letters that make up the puzzle
     * @param {string | null} previousWord Either null (for the first word) or the last link in the chain
     * @param {Set<string>} desiredLetters The letters we would like to use in the next word
     * @param {string[]} dictionary A list of words to search through
     */
    constructor(puzzleTriplets, previousWord, desiredLetters, dictionary) {
        this.puzzleTriplets = puzzleTriplets;
        // If this is the first word link, do an initial filter of the dictionary
        this.dictionary = previousWord ? dictionary : dictionary.filter((word) => this.isValidWord(word));
        // Filter the dictionary to only include words that start with the last letter of the previous word
        this.words = !previousWord ? this.dictionary : this.dictionary.filter((word) => word !== previousWord && word[0] === previousWord?.slice(-1) && word.split("").some((letter) => desiredLetters.has(letter)));
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

    createNextLink() {
        return new WordLink(this.puzzleTriplets, this.currentWord(), this.getLetterStillUnusedAfterThisLink(), this.dictionary);
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

    /**
     * @param {string} word Any string from the dictionary
     * @returns true if the word can be created from the challenge triplets as per the rules
     */
    isValidWord(word) {
        // Check if the word is too short
        if (word.length < 3) {
            return false;
        }
        // Check that the word satisfies the puzzle constraints
        let previousIndex = -1;
        for (let letter of word) {
            let index = this.puzzleTriplets.findIndex((triplet) => triplet.includes(letter));
            if (index === -1 || index === previousIndex) {
                return false;
            }
            previousIndex = index;
        }

        return true;
    }
}

/**
 * This type will manage the table displaying the solution, which will consist of a row containing the solution words in text edits, and a row beneath with a button allowing the user to select the next word in that WordLink.
 *
 * Each column will have an associated WordLink object, which will be used to determine the next word in the chain, if the user presses the associated button.
 *
 * Each time the user edits the word in the text box, or presses the button, the WordLink object will be updated, and each subsequent column will be recalculated, with new buttons and word links.
 */
class SolutionTable {
    constructor(challengeTriplets, dictionary) {
        this.challengeTriplets = challengeTriplets;
        this.dictionary = dictionary;
        this.links = [];
    }

    addLink() {
        if (this.links.length === 0) {
            let link = new WordLink(this.challengeTriplets, null, new Set(this.challengeTriplets.join("")), this.dictionary);
            this.links.push(link);
        } else {
            this.links.push(this.links[this.links.length - 1].createNextLink());
        }
    }

    canAddLink() {
        let lastLink = this.links.length === 0 ? null : this.links[this.links.length - 1];
        return !lastLink || (!lastLink.doesCurrentWordCompleteChain() && lastLink.currentWord() !== "");
    }

    recalculateSolution() {
        while (this.canAddLink()) {
            this.addLink();
        }
    }

    recalculateSolutionFromIndex(index) {
        // If the index is the final link, create a new link
        if (index === this.links.length - 1) {
            while (this.canAddLink()) {
                this.addLink();
            }
        } else {
            //  Remove all links after index and re-create them
            this.links = this.links.slice(0, index + 1);
            while (this.canAddLink()) {
                this.addLink();
            }
        }
        this.rebuildTable();
    }

    rebuildTable() {
        // Get DOM table
        let solutionTable = document.querySelector("#solution_table");
        solutionTable.innerHTML = "";

        if (this.links.length === 0 || !this.links[this.links.length - 1].doesCurrentWordCompleteChain()) {
            solutionTable.insertRow().insertCell().textContent = "No solution found";
            return;
        }

        let wordRow = solutionTable.insertRow();
        let buttonRow = solutionTable.insertRow();
        for (let [index, link] of this.links.entries()) {
            // Insert a text edit with the word as text
            let wordCell = wordRow.insertCell();
            // MAYBE: Allow the user to edit the word, currently disabled as recalculateSolutionFromIndex calls rebuild table, which undoes the user input
            // let wordInput = document.createElement("input");
            // wordInput.type = "text";
            // wordInput.value = link.currentWord();
            // wordCell.appendChild(wordInput);
            // attachListener(wordInput, "input", (event) => {
            //     this.recalculateSolutionFromIndex(index + 1);
            // });
            wordCell.textContent = link.currentWord();
            // Insert a button to select the next word
            let buttonCell = buttonRow.insertCell();
            let nextWordButton = document.createElement("button");
            nextWordButton.textContent = "Next word";
            buttonCell.appendChild(nextWordButton);
            attachListener(nextWordButton, "click", () => {
                this.links[index].nextWord();
                this.recalculateSolutionFromIndex(index);
            });
        }
    }

    resetSolution() {
        this.links = [];
        this.recalculateSolution();
        this.rebuildTable();
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
    fetch("assets/data/SCOWL-en_GB-large.txt")
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
    resetSolution();
}

function resizeGrid() {
    const grid = document.querySelector(".letter_boxed_grid");
    const gridOwner = grid.parentElement;
    const gridSize = gridOwner.clientWidth / 2;

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
    let challengeTriplets = ["", "", "", ""];
    let inputs = document.querySelectorAll(".lb_cell[type='text']");
    for (let input of inputs) {
        let index = parseInt(input.getAttribute("triplet"));
        challengeTriplets[index] = challengeTriplets[index] + input.value.toLowerCase();
    }
    let dictionary = document.querySelector("#dictionary_input").value.split("\n");

    new SolutionTable(challengeTriplets, dictionary).resetSolution();
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
    for (let input of document.querySelectorAll(".lb_cell[type='text']")) {
        attachListener(input, "input", resetSolution);
    }
    resetSolution();
});
