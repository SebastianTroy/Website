# ##################################################################### #
# autoRecipes.py scans the recipes/ directory for .md files, extracts   #
# the recipe information, and generates html pages in the style of the  #
# website. It also collates this information to create a recipes index  #
# page, with filters for meal type, dietary requirements, and cook      #
# times.                                                                #
# ##################################################################### #

import os
import re


# Convert kebab-case filename to a human readable recipe name
def getRecipeNameFromFilename(filename: str) -> str:
    # Replace - with spaces
    # Replace and with &
    # Capitalise all words (except for: of, the, with, in, on, at, to, from)
    name = filename.replace("-", " ").replace(" and ", " & ")
    name = re.sub(r'\b(of|the|with|in|on|at|to|from)\b', lambda m: m.group(0).lower(), name, flags=re.IGNORECASE)
    name = name.title()
    return name


# Hold-all for a single recipe
class Recipe:
    def __init__(self, filename: str, type: str, dietary: list[str], serves: int, cook_time: int, source: str, description: str, ingredients: list[str], method: list[str]):
        self.filename = filename.removesuffix(".md")# Name used to find the html, and jpg files for this recipe
        self.name = getRecipeNameFromFilename(self.filename) # Title for the recipe
        self.type = type       # Used to filter between mains, desserts, canapes e.t.c.
        self.dietary = dietary # Used to filter out allergens e.t.c.
        self.serves = serves   # Used to filter on how many people we can feed
        self.cook_time = cook_time # Used to filter based on cook time
        self.source = source       # Used to credit the original recipe
        self.description = description # Brief description of the recipe, used on the recipe card in the index page
        self.ingredients = ingredients # List of ingredients, used on the recipe page
        self.method = method           # List of steps, used on the recipe page


# Parses a single Recipe object from a markdown file, and validates the content
def parseRecipeMarkdown(filePath: str) -> Recipe:
    filename: str = os.path.basename(filePath)

    expectedSections: list[str] = ["## Meta", "## Description", "## Ingredients", "## Method"]
    expectedMetaFields: list[str] = ["type", "dietary", "serves", "prep_time", "cook_time", "source"]

    currentSection: str = ""

    type: str = ""
    dietary: list[str] = []
    serves: int = 0
    cook_time: int = 0
    source: str = ""
    description: str = ""
    ingredients: list[str] = []
    method: list[str] = []
    
    foundSections: list[str] = []
    foundMetaFields: list[str] = []
    with open(filePath, 'r') as f:
        # instead of many complex and slow regexes, we'll parse line by line
        for line in f:
            line = line.strip()
            # skip empty lines and comments
            if line == "" or line.startswith("<!--"):
                continue

            # Found a new section
            if line.startswith("##"):
                currentSection = line
                foundSections.append(currentSection)
            
            # Parsing meta-data
            elif currentSection == "## Meta":
                fieldName, fieldValue = line.split(":", 1)
                fieldName = fieldName.strip()
                fieldValue = fieldValue.strip()
                foundMetaFields.append(fieldName)
                if fieldName == "type":
                    type = fieldValue
                elif fieldName == "dietary":
                    if fieldValue:
                        dietary = [x.strip() for x in fieldValue.split(",")]
                elif fieldName == "serves":
                    serves = int(fieldValue)
                elif fieldName == "prep_time":
                    cook_time += int(fieldValue)
                elif fieldName == "cook_time":
                    cook_time += int(fieldValue)
                elif fieldName == "source":
                    source = fieldValue
            
            # Parsing description
            elif currentSection == "## Description":
                description += line + "\n"

            # Parsing ingredients
            elif currentSection == "## Ingredients":
                ingredient: str = line.strip().lstrip("-").strip()
                ingredients.append(ingredient)
            
            # Parsing method
            elif currentSection == "## Method":
                # strip step numbers or - from the start of the line
                step: str = line.strip().lstrip("-").lstrip("0123456789.").strip()
                method.append(step)

    # check we found all the expected sections and meta fields
    if not all(section in foundSections for section in expectedSections):
        print(f"    Error: Missing section in {filename}. Please add: {', '.join([section for section in expectedSections if section not in foundSections])} section(s).")
    if not all(field in foundMetaFields for field in expectedMetaFields):
        print(f"    Error: Missing meta field in {filename}. Please add: {', '.join([field for field in expectedMetaFields if field not in foundMetaFields])} field(s).")
    # CHeck for unexpected sections and meta fields
    if not all(section in expectedSections for section in foundSections):
        print(f"    Error: Unexpected section in {filename}. Please remove: {', '.join([section for section in foundSections if section not in expectedSections])} section(s).")
    if not all(field in expectedMetaFields for field in foundMetaFields):
        print(f"    Error: Unexpected meta field in {filename}. Please remove: {', '.join([field for field in foundMetaFields if field not in expectedMetaFields])} field(s).")

    # Check an image file exists in the assets directory
    recipeImage = os.path.join("assets/images/recipes", f"{filename.removesuffix(".md")}.jpg")
    if not os.path.exists(recipeImage):
        print(f"    Error: Image file {recipeImage} not found.")

    return Recipe(filename, type, dietary, serves, cook_time, source, description.strip(), ingredients, method)


# Uses some templates and a Recipe to generate a block of HTML
# that can be inserted into a standard "grid" div, where "grid"
# is a class used in recipes.html to layout the recipe cards
def generateRecipeCardGrid(recipes: list[Recipe]) -> str:
    recipeCardTemplate: str = """
<div class="{classes}" data-cook-time="{cook_time}" data-serves="{serves}">
    <h3>{name}</h3>
    <a class="image_link" href="recipes/{filename}.html">
        <img src="assets/images/recipes/{thumbnail}.jpg" alt="{name}">
    </a>
    <div class="text">{description}</div>
    <div class="recipe_tags">
        {tags}
    </div>
    <h5>Serves {serves} | Takes {cook_time} mins</h5>
    <a class="more_info_button" href="recipes/{filename}.html">View Recipe</a>
</div>
"""
    tagSpanTemplate: str = '<span class="tag">{tag}</span>'

    html: str = ""
    for recipe in recipes:
        # concatenate the type and dietary list lower case class names
        # These will be used to toggle visibility
        classes: str = recipe.type
        if recipe.dietary:
            classes += " " + " ".join(recipe.dietary)
        classes = classes.lower()
        tags: str = tagSpanTemplate.format(tag=recipe.type)
        for dietary in recipe.dietary:
            tags += tagSpanTemplate.format(tag=dietary)
        html += recipeCardTemplate.format(classes=classes, name=recipe.name, filename=recipe.filename, thumbnail=recipe.filename, description=recipe.description, tags=tags, serves=recipe.serves, cook_time=recipe.cook_time)

    paddingDivsRequired = 3 - (len(recipes) % 3)
    html += '<div note="placeholder to prevent last item expanding into multiple slots"></div>\n' * paddingDivsRequired
    return html


def generateTypeFilterControls(recipes: list[Recipe]) -> str:
    types: set[str] = set(recipe.type for recipe in recipes)
    filterTemplate: str = """
<input type="checkbox" id="filter_{type}" class="filter_checkbox" data-type="{type}" hidden>
<label for="filter_{type}" class="filter_button">{type} ({count})</label>
"""
    html: str = ""
    for type in types:
        count = sum(type == recipe.type for recipe in recipes)
        html += filterTemplate.format(type=type, count=count)
    return html


def generateDietaryFilterControls(recipes: list[Recipe]) -> str:
    dietaryOptions: set[str] = set(dietary for recipe in recipes for dietary in recipe.dietary)
    filterTemplate: str = """
<input type="checkbox" id="filter_{dietary}" class="filter_checkbox" data-dietary="{dietary}" hidden>
<label for="filter_{dietary}" class="filter_button">{dietary} ({count})</label>
"""
    html: str = ""
    for dietary in dietaryOptions:
        count = sum(dietary in recipe.dietary for recipe in recipes)
        html += filterTemplate.format(dietary=dietary, count=count)
    return html


def generateCookTimeFilterControls(recipes: list[Recipe]) -> str:
    maxCookTime: int = max(recipe.cook_time for recipe in recipes)
    slots = []
    slot_size = 30
    for start in range(0, maxCookTime + 1, slot_size):
        end = min(start + slot_size - 1, maxCookTime)
        slots.append((start, end))
    filterTemplate: str = """
<input type="checkbox" id="cooktime_{min}_{max}" class="filter_checkbox" data-cook-time-min="{min}" data-cook-time-max="{max}" hidden>
<label for="cooktime_{min}_{max}" class="filter_button">{label}</label>
"""
    html = ''
    for minval, maxval in slots:
        count = sum(minval <= r.cook_time <= maxval for r in recipes)
        if count == 0:
            continue
        if minval == maxval:
            label = f"{minval} min ({count})"
        else:
            label = f"{minval}-{maxval} min ({count})"
        html += filterTemplate.format(min=minval, max=maxval, label=label)
    return html


def generateServesFilterControls(recipes: list[Recipe]) -> str:
    maxServes: int = max(recipe.serves for recipe in recipes)
    slots = []
    slot_size = 2
    for start in range(1, maxServes + 1, slot_size):
        end = min(start + slot_size - 1, maxServes)
        slots.append((start, end))
    filterTemplate: str = """
<input type="checkbox" id="serves_{min}_{max}" class="filter_checkbox" data-serves-min="{min}" data-serves-max="{max}" hidden>
<label for="serves_{min}_{max}" class="filter_button">{label}</label>
"""
    html = ''
    for minval, maxval in slots:
        count = sum(minval <= r.serves <= maxval for r in recipes)
        if count == 0:
            continue
        if minval == maxval:
            label = f"Serves {minval} ({count})"
        else:
            label = f"Serves {minval}-{maxval} ({count})"
        html += filterTemplate.format(min=minval, max=maxval, label=label)
    return html


# Takes a multi-line HTML string, and applies the indentation of
# the reference string to it.
def applyIndentation(html: str, reference: str) -> str:
    indentLen: int = len(reference) - len(reference.lstrip())
    indent: str = " " * indentLen
    return indent + html.replace("\n", "\n" + indent).rstrip()


def createRecipeIndexPage(recipes: list[Recipe]):
    with open("recipes-template.html", "r") as f:
        template: str = f.read()

    typeFiltersHtml: str = generateTypeFilterControls(recipes)
    typeFilterSentinel: str = next(line for line in template.splitlines() if "<!-- TYPE FILTER TOGGLES SENTINEL -->" in line)
    typeFiltersHtml = applyIndentation(typeFiltersHtml, typeFilterSentinel)

    dietaryFiltersHtml: str = generateDietaryFilterControls(recipes)
    dietaryFilterSentinel: str = next(line for line in template.splitlines() if "<!-- DIETARY FILTER TOGGLES SENTINEL -->" in line)
    dietaryFiltersHtml = applyIndentation(dietaryFiltersHtml, dietaryFilterSentinel)

    cookTimeFilterControls: str = generateCookTimeFilterControls(recipes)
    cookTimeFilterSentinel: str = next(line for line in template.splitlines() if "<!-- COOKTIME SLIDERS SENTINEL -->" in line)
    cookTimeFilterControls = applyIndentation(cookTimeFilterControls, cookTimeFilterSentinel)

    servesFilterControls: str = generateServesFilterControls(recipes)
    servesFilterSentinel: str = next(line for line in template.splitlines() if "<!-- SERVINGS SLIDERS SENTINEL -->" in line)
    servesFilterControls = applyIndentation(servesFilterControls, servesFilterSentinel)

    recipeCardsHtml: str = generateRecipeCardGrid(recipes)
    recipeSentinel: str = next(line for line in template.splitlines() if "<!-- RECIPE CARDS SENTINEL -->" in line)
    recipeCardsHtml = applyIndentation(recipeCardsHtml, recipeSentinel)

    outputHtml: str = template.replace(typeFilterSentinel, typeFiltersHtml)
    outputHtml = outputHtml.replace(dietaryFilterSentinel, dietaryFiltersHtml)
    outputHtml = outputHtml.replace(cookTimeFilterSentinel, cookTimeFilterControls)
    outputHtml = outputHtml.replace(servesFilterSentinel, servesFilterControls)
    outputHtml = outputHtml.replace(recipeSentinel, recipeCardsHtml)

    with open("recipes.html", "w") as f:
        f.write(outputHtml)


def createRecipePage(recipe: Recipe):
    with open("recipes/recipe-template.html", "r") as f:
        template: str = f.read()

    title = recipe.name
    image = f"../assets/images/recipes/{recipe.filename}.jpg"
    description = recipe.description
    serves = recipe.serves
    cook_time = recipe.cook_time
    source = recipe.source
    tags = f'<span class="tag">{recipe.type}</span>'
    for dietary in recipe.dietary:
        tags += f'<span class="tag">{dietary}</span>'
    ingredients = "<ul>\n"
    for ingredient in recipe.ingredients:
        ingredients += f'    <li><input type="checkbox" class="ingredient_checkbox"><label>{ingredient}</label></li>\n'
    ingredients += "</ul>"
    method = "<ol>\n"
    for step in recipe.method:
        method += f'    <li><input type="checkbox" class="method_checkbox"><label>{step}</label></li>\n'
    method += "</ol>"

    # If source is a URL, make it a clickable link
    if source.startswith("http://") or source.startswith("https://"):
        source = f'<a href="{source}" target="_blank" rel="noopener noreferrer">{source}</a>'

    outputHtml: str = template.format(title=title, image=image, description=description, serves=serves, cook_time=cook_time, source=source, tags=tags, ingredients=ingredients, method=method)

    with open(f"recipes/{recipe.filename}.html", "w") as f:
        f.write(outputHtml)


if __name__ == "__main__":
    recipesDir: str = "recipes"
    recipes: list[Recipe] = []
    for filename in os.listdir(recipesDir):
        if filename.endswith(".md"):
            print(f"Parsing {filename}...")
            recipes.append(parseRecipeMarkdown(os.path.join(recipesDir, filename)))
    
    createRecipeIndexPage(recipes)

    for recipe in recipes:
        print(f"Creating page for {recipe.name}...")
        createRecipePage(recipe)

