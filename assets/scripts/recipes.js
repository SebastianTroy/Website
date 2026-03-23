attachListener(document, "DOMContentLoaded", function () {
    const typeFilters = Array.from(document.querySelectorAll(".type_radio"));
    const dietaryFilters = Array.from(document.querySelectorAll(".filter_checkbox"));
    const cards = Array.from(document.querySelectorAll(".cards_container > div")).filter(card => card.hasAttribute("data-tags"));
    const placeholderCards = Array.from(document.querySelectorAll(".cards_container > div")).filter(card => !card.hasAttribute("data-tags"));
    const cardsContainer = document.querySelector(".cards_container");

    function hideFilteredCards() {
        const visibletype = typeFilters.find(radio => radio.checked).getAttribute("data-type");

        const hiddenDietary = Array.from(dietaryFilters)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.getAttribute("data-dietary"));

        const maxCookTime = parseInt(cookTimeSlider.value, 10);
        const servesAtLeast = parseInt(servesSlider.value, 10);

        cards.forEach(function (card) {
            let hidden = false;

            const cardTags = card.getAttribute("data-tags").split(" ");
            if (visibletype !== "all" && !cardTags.includes(visibletype)) {
                hidden = true;
            } else if (cardTags.some(tag => hiddenDietary.includes(tag))) {
                hidden = true;
            }

            const cookTime = parseInt(card.getAttribute('data-cook-time'), 10);
            if (cookTime > maxCookTime) {
                hidden = true;
            }

            const serves = parseInt(card.getAttribute('data-serves'), 10);
            if (serves < servesAtLeast) {
                hidden = true;
            }

            card.classList.toggle('hidden', hidden);
        });
    }

    function sortCardsByCookTime(cards, ascending) {
        const sortedCards = cards.sort((a, b) => {
            const cookTimeA = parseInt(a.getAttribute("data-cook-time"), 10);
            const cookTimeB = parseInt(b.getAttribute("data-cook-time"), 10);
            return ascending ? cookTimeA - cookTimeB : cookTimeB - cookTimeA;
        });

        sortedCards.concat(placeholderCards).forEach(card => cardsContainer.appendChild(card));
    }

    function sortCardsByServes(cards, ascending) {
        const sortedCards = cards.sort((a, b) => {
            const servesA = parseInt(a.getAttribute("data-serves"), 10);
            const servesB = parseInt(b.getAttribute("data-serves"), 10);
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
});
