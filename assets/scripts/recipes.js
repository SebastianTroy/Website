function sortCardsByCookTime(largestFirst) {
    const cards = document.querySelectorAll(".grid > div");
    const sortedCards = Array.from(cards).sort((a, b) => {
        const cookTimeA = parseInt(a.getAttribute("data-cook-time"), 10);
        const cookTimeB = parseInt(b.getAttribute("data-cook-time"), 10);
        return largestFirst ? cookTimeB - cookTimeA : cookTimeA - cookTimeB;
    });

    const grid = document.querySelector(".grid");
    sortedCards.forEach(card => grid.appendChild(card));
}

function sortCardsByServes(largestFirst) {
    const cards = document.querySelectorAll(".grid > div");
    const sortedCards = Array.from(cards).sort((a, b) => {
        const servesA = parseInt(a.getAttribute("data-serves"), 10);
        const servesB = parseInt(b.getAttribute("data-serves"), 10);
        return largestFirst ? servesB - servesA : servesA - servesB;
    });

    const grid = document.querySelector(".grid");
    sortedCards.forEach(card => grid.appendChild(card));
}

function sortCardsByName(ascending) {
    const cards = Array.from(document.querySelectorAll(".grid > div"));
    const recipeCards = cards.filter(card => card.querySelector("h3"));
    const placeholderCards = cards.filter(card => !card.querySelector("h3"));

    const sortedCards = recipeCards.sort((a, b) => {
        const nameA = a.querySelector("h3").textContent.trim().toLowerCase();
        const nameB = b.querySelector("h3").textContent.trim().toLowerCase();
        if (nameA < nameB) return ascending ? -1 : 1;
        if (nameA > nameB) return ascending ? 1 : -1;
        return 0;
    });

    const grid = document.querySelector(".grid");
    sortedCards.concat(placeholderCards).forEach(card => grid.appendChild(card));
}

attachListener(document, "DOMContentLoaded", function () {
    const checkboxes = document.querySelectorAll(".filter_checkbox");
    const cards = document.querySelectorAll(".grid > div");

    const typeFilters = Array.from(checkboxes).filter(c => c.getAttribute("data-type"));
    const dietaryFilters = Array.from(checkboxes).filter(c => c.getAttribute("data-dietary"));

    const cookTimeFilters = Array.from(checkboxes).filter(c => {
        return c.getAttribute("data-cook-time-min") && c.getAttribute("data-cook-time-max");
    });

    const servesFilters = Array.from(checkboxes).filter(c => {
        return c.getAttribute("data-serves-min") && c.getAttribute("data-serves-max");
    });

    checkboxes.forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
            // Use setTimeout to ensure the DOM updates with the new checkbox state before we read it
            setTimeout(function () {
                const hiddenTypes = Array.from(typeFilters)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => checkbox.getAttribute("data-type"));

                const hiddenDietary = Array.from(dietaryFilters)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => checkbox.getAttribute("data-dietary"));

                const hiddenCookTimeRanges = Array.from(cookTimeFilters)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => [
                        checkbox.getAttribute("data-cook-time-min"),
                        checkbox.getAttribute("data-cook-time-max")
                    ]);

                const hiddenServesRanges = Array.from(servesFilters)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => [
                        checkbox.getAttribute("data-serves-min"),
                        checkbox.getAttribute("data-serves-max")
                    ]);

                    
                cards.forEach(function (card) {
                    let hidden = false;    

                    for (const cls of card.classList) {
                        if (hiddenTypes.includes(cls) || hiddenDietary.includes(cls)) {
                            hidden = true;
                            break;
                        }
                    }

                    cookTime = parseInt(card.getAttribute('data-cook-time'), 10);
                    if (hiddenCookTimeRanges.some(([min, max]) => cookTime >= Number(min) && cookTime <= Number(max))) {
                        hidden = true;
                    }

                    serves = parseInt(card.getAttribute('data-serves'), 10);
                    if (hiddenServesRanges.some(([min, max]) => serves >= Number(min) && serves <= Number(max))) {
                        hidden = true;
                    }

                    card.classList.toggle('hidden', hidden);
                });
            }, 0);
        });
    });

    let lastSort = null;
    let ascending = true;
    document.querySelectorAll('.sorting_radio').forEach(radio => {
        radio.addEventListener('click', function (e) {
            if (lastSort === radio) {
                ascending = !ascending; // toggle direction
            } else {
                ascending = true;
                lastSort = radio;
            }
            const sortBy = radio.getAttribute('data-sort-by');
            if (sortBy === 'cook-time') {
                sortCardsByCookTime(ascending);
            } else if (sortBy === 'serves') {
                sortCardsByServes(ascending);
            } else if (sortBy === 'name') {
                sortCardsByName(ascending);
            }
        });
    });
});
