attachListener(document, "DOMContentLoaded", function () {
    if (!document.querySelector(".cards_container")) {
        setUpRecipePage();
    } else {
        setUpRecipesIndex();
    }
});

// Recipe pages: show one variant at a time, and keep it in the URL hash so it can be linked to
function setUpRecipePage() {
    const variantRadios = Array.from(document.querySelectorAll(".variant_radio"));
    function showVariant(id) {
        document.querySelectorAll(".recipe_variant").forEach(function (div) {
            div.hidden = div.getAttribute("data-variant") !== id;
        });
    }
    variantRadios.forEach(function (radio) {
        radio.addEventListener("change", function () {
            showVariant(radio.getAttribute("data-variant"));
            history.replaceState(null, "", "#" + radio.getAttribute("data-variant"));
        });
    });
    const linkedVariant = variantRadios.find(radio => "#" + radio.getAttribute("data-variant") === location.hash);
    if (linkedVariant) {
        linkedVariant.checked = true;
        showVariant(linkedVariant.getAttribute("data-variant"));
    }
}

// The recipes index page: filters, sorting, and each recipe's variant switch
function setUpRecipesIndex() {
    const typeFilters = Array.from(document.querySelectorAll(".type_radio"));
    const dietaryFilters = Array.from(document.querySelectorAll(".filter_checkbox"));
    // Each of these is a recipe_group, holding one recipe_card per variant
    const cards = Array.from(document.querySelectorAll(".cards_container > div")).filter(card => card.classList.contains("recipe_group"));
    const placeholderCards = Array.from(document.querySelectorAll(".cards_container > div")).filter(card => !card.classList.contains("recipe_group"));
    const cardsContainer = document.querySelector(".cards_container");

    function hideFilteredCards() {
        const visibletype = typeFilters.find(radio => radio.checked).getAttribute("data-type");

        const hiddenDietary = Array.from(dietaryFilters)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.getAttribute("data-dietary"));

        const maxCookTime = parseInt(cookTimeSlider.value, 10);
        const servesAtLeast = parseInt(servesSlider.value, 10);

        cards.forEach(function (group) {
            const variantCards = Array.from(group.querySelectorAll(".recipe_card"));
            const passing = variantCards.filter(card => filteredOutBecause(card) === "");

            // Variants that don't pass are disabled in the picker, with the reason,
            // and if the one showing doesn't pass, the first one that does is shown instead
            group.querySelectorAll(".variant_select option").forEach(function (option) {
                const reason = filteredOutBecause(group.querySelector('.recipe_card[data-variant="' + option.value + '"]'));
                option.disabled = reason !== "";
                option.textContent = option.getAttribute("data-name") + (reason !== "" ? " (" + reason + ")" : "");
            });
            if (passing.length > 0 && !passing.includes(shownCard(group))) {
                showCard(group, passing[0].getAttribute("data-variant"));
            }

            group.classList.toggle('hidden', passing.length === 0);
        });

        // Why a card doesn't pass the filters, or "" if it does
        function filteredOutBecause(card) {
            const cardTags = card.getAttribute("data-tags").split(" ");
            const hiddenTags = cardTags.filter(tag => hiddenDietary.includes(tag));
            if (visibletype !== "all" && !cardTags.includes(visibletype)) {
                return "not a " + visibletype;
            } else if (hiddenTags.length > 0) {
                return hiddenTags.join(", ");
            } else if (parseInt(card.getAttribute("data-cook-time"), 10) > maxCookTime) {
                return "takes " + card.getAttribute("data-cook-time") + " mins";
            } else if (parseInt(card.getAttribute("data-serves"), 10) < servesAtLeast) {
                return "serves " + card.getAttribute("data-serves");
            }
            return "";
        }
    }

    function shownCard(group) {
        return group.querySelector(".recipe_card:not([hidden])");
    }

    function showCard(group, variantId) {
        group.querySelectorAll(".recipe_card").forEach(function (card) {
            card.hidden = card.getAttribute("data-variant") !== variantId;
        });
        group.querySelectorAll(".variant_select").forEach(function (select) {
            select.value = variantId;
        });
    }

    cards.forEach(function (group) {
        group.querySelectorAll(".variant_select").forEach(function (select) {
            select.addEventListener("change", function () {
                showCard(group, select.value);
            });
        });
    });

    function sortCardsByCookTime(cards, ascending) {
        const sortedCards = cards.sort((a, b) => {
            const cookTimeA = parseInt(shownCard(a).getAttribute("data-cook-time"), 10);
            const cookTimeB = parseInt(shownCard(b).getAttribute("data-cook-time"), 10);
            return ascending ? cookTimeA - cookTimeB : cookTimeB - cookTimeA;
        });

        sortedCards.concat(placeholderCards).forEach(card => cardsContainer.appendChild(card));
    }

    function sortCardsByServes(cards, ascending) {
        const sortedCards = cards.sort((a, b) => {
            const servesA = parseInt(shownCard(a).getAttribute("data-serves"), 10);
            const servesB = parseInt(shownCard(b).getAttribute("data-serves"), 10);
            return ascending ? servesA - servesB : servesB - servesA;
        });

        sortedCards.concat(placeholderCards).forEach(card => cardsContainer.appendChild(card));
    }

    function sortCardsByName(cards, ascending) {
        const sortedCards = cards.sort((a, b) => {
            const nameA = a.querySelector("h3").textContent.trim().toLowerCase();
            const nameB = b.querySelector("h3").textContent.trim().toLowerCase();
            if (nameA < nameB) return ascending ? -1 : 1;
            if (nameA > nameB) return ascending ? 1 : -1;
            return 0;
        });

        sortedCards.concat(placeholderCards).forEach(card => cardsContainer.appendChild(card));
    }

    function sortCardsRandomly(cards) {
        // Fisher-Yates shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        cards.concat(placeholderCards).forEach(card => cardsContainer.appendChild(card));
    }

    typeFilters.forEach(function (radio) {
        radio.addEventListener("change", function () {
            // Use setTimeout to ensure the DOM updates with the new radio state before we read it
            setTimeout(function () {
                hideFilteredCards();
            }, 0);
        });
    });

    dietaryFilters.forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
            // Use setTimeout to ensure the DOM updates with the new checkbox state before we read it
            setTimeout(function () {
                hideFilteredCards();
            }, 0);
        });
    });


    const cookTimeSlider = document.getElementById("cooktime_slider");
    const cookTimeCount = document.getElementById("cooktime_count");
    cookTimeSlider.addEventListener("input", function () {
        setTimeout(function () {
            cookTimeCount.textContent = cookTimeSlider.value;
            hideFilteredCards();
        }, 0);
    });

    const servesSlider = document.getElementById("serves_slider");
    const servesCount = document.getElementById("serves_count");
    servesSlider.addEventListener("input", function () {
        setTimeout(function () {
            servesCount.textContent = servesSlider.value;
            hideFilteredCards();
        }, 0);
    });

    let lastSort = document.querySelector('.sorting_radio:checked');
    let ascending = true;
    document.querySelectorAll('.sorting_radio').forEach(radio => {
        radio.addEventListener('click', function (e) {
            setTimeout(function () {
                if (lastSort === radio) {
                    ascending = !ascending; // toggle direction
                } else {
                    ascending = true;
                    lastSort = radio;
                }

                const sortBy = radio.getAttribute('data-sort-by');
                if (sortBy === 'cook-time') {
                    sortCardsByCookTime(cards, ascending);
                    const arrow = radio.nextElementSibling.querySelector('.sorting_arrow');
                    arrow.textContent = ascending ? '▲' : '▼';
                } else if (sortBy === 'serves') {
                    sortCardsByServes(cards, ascending);
                    const arrow = radio.nextElementSibling.querySelector('.sorting_arrow');
                    arrow.textContent = ascending ? '▲' : '▼';
                } else if (sortBy === 'name') {
                    sortCardsByName(cards, ascending);
                    const arrow = radio.nextElementSibling.querySelector('.sorting_arrow');
                    arrow.textContent = ascending ? '▲' : '▼';
                } else if (sortBy === 'random') {
                    sortCardsRandomly(cards);
                }
            }, 0);
        });
    });

    const sliders = document.querySelectorAll('.filter_slider');
    sliders.forEach(slider => {
        function updateSliderBackground() {
            const min = slider.min ? slider.min : 0;
            const max = slider.max ? slider.max : 100;
            const val = slider.value;
            const percent = ((val - min) * 100) / (max - min);
            slider.style.setProperty('--value', percent);
        }
        slider.addEventListener('input', updateSliderBackground);
        updateSliderBackground();
    });
}
