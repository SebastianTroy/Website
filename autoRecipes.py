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


# Turns a variant name into an id, used in the recipe page's URL hash
def getVariantId(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


# Hold-all for one version of a recipe
class Variant:
    def __init__(self, name: str, type: str, dietary: list[str], serves: int, cook_time: int, source: str, uploaded_by: str, description: str, ingredients: list[str], method: list[str]):
        self.name = name       # Shown on the recipe page's variant switch
        self.id = getVariantId(name) # Used to link to this variant
        self.type = type       # Used to filter between mains, desserts, canapes e.t.c.
        self.dietary = dietary # Used to filter out allergens e.t.c.
        self.serves = serves   # Used to filter on how many people we can feed
        self.cook_time = cook_time # Used to filter based on cook time
        self.source = source       # Used to credit the original recipe
        self.uploaded_by = uploaded_by # Used to credit the person who uploaded the recipe
        self.description = description # Brief description of the recipe, used on the recipe card in the index page
        self.ingredients = ingredients # List of ingredients, used on the recipe page
        self.method = method           # List of steps, used on the recipe page


# Hold-all for a single recipe, and its variants
class Recipe:
    def __init__(self, filename: str, variants: list[Variant]):
        self.filename = filename.removesuffix(".md")# Name used to find the html, and jpg files for this recipe
        self.name = getRecipeNameFromFilename(self.filename) # Title for the recipe
        self.variants = variants # The first is the original, the rest are listed in the order they appear in the file

    @property
    def original(self) -> Variant:
        return self.variants[0]


# Parses a Recipe from a markdown file, and validates the content.
# Each "## Meta" section starts a new variant, named by its "variant" field
# ("Original" if missing). Any section or meta field a variant leaves out is
# taken from the first variant in the file.
def parseRecipeMarkdown(filePath: str) -> Recipe:
    filename: str = os.path.basename(filePath)

    expectedSections: list[str] = ["## Meta", "## Description", "## Ingredients", "## Method"]
    expectedMetaFields: list[str] = ["type", "dietary", "serves", "prep_time", "cook_time", "source", "uploaded_by"]
    optionalMetaFields: list[str] = ["variant"]

    # Each block is one variant: its meta fields, and the lines of its other sections
    blocks: list[dict] = []
    currentSection: str = ""
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
                if currentSection == "## Meta":
                    blocks.append({"meta": {}, "sections": {}})
                elif not blocks:
                    print(f"    Error: {filename} must start with a ## Meta section.")
                    blocks.append({"meta": {}, "sections": {}})
                if currentSection in blocks[-1]["sections"]:
                    print(f"    Error: {currentSection} appears twice in one variant of {filename}.")
                blocks[-1]["sections"][currentSection] = []

            # Parsing meta-data
            elif currentSection == "## Meta":
                fieldName, fieldValue = line.split(":", 1)
                blocks[-1]["meta"][fieldName.strip()] = fieldValue.strip()

            # Parsing every other section
            elif blocks:
                blocks[-1]["sections"][currentSection].append(line)

    if not blocks:
        print(f"    Error: {filename} has no ## Meta section.")
        blocks.append({"meta": {}, "sections": {}})

    # check the first variant has all the expected sections and meta fields
    original: dict = blocks[0]
    missingSections = [section for section in expectedSections if section not in original["sections"]]
    if missingSections:
        print(f"    Error: Missing section in {filename}. Please add: {', '.join(missingSections)} section(s).")
    missingFields = [field for field in expectedMetaFields if field not in original["meta"]]
    if missingFields:
        print(f"    Error: Missing meta field in {filename}. Please add: {', '.join(missingFields)} field(s).")
    # Check every variant for unexpected sections and meta fields
    for block in blocks:
        unexpectedSections = [section for section in block["sections"] if section not in expectedSections]
        if unexpectedSections:
            print(f"    Error: Unexpected section in {filename}. Please remove: {', '.join(unexpectedSections)} section(s).")
        unexpectedFields = [field for field in block["meta"] if field not in expectedMetaFields + optionalMetaFields]
        if unexpectedFields:
            print(f"    Error: Unexpected meta field in {filename}. Please remove: {', '.join(unexpectedFields)} field(s).")
    for block in blocks[1:]:
        if "variant" not in block["meta"]:
            print(f"    Error: Every variant after the first in {filename} needs a variant: name.")

    variants: list[Variant] = []
    for block in blocks:
        # Fill in anything this variant leaves out from the original
        meta: dict = original["meta"] | block["meta"]
        sections: dict = original["sections"] | block["sections"]
        variants.append(Variant(
            name = block["meta"].get("variant", "Original"),
            type = meta.get("type", ""),
            dietary = [x.strip() for x in meta.get("dietary", "").split(",") if x.strip()],
            serves = int(meta.get("serves", 0)),
            cook_time = int(meta.get("prep_time", 0)) + int(meta.get("cook_time", 0)),
            source = meta.get("source", ""),
            uploaded_by = meta.get("uploaded_by", ""),
            description = "\n".join(sections.get("## Description", [])),
            ingredients = [line.lstrip("-").strip() for line in sections.get("## Ingredients", [])],
            # strip step numbers or - from the start of the line
            method = [line.lstrip("-0123456789.").strip() for line in sections.get("## Method", [])],
        ))

    variantIds: list[str] = [variant.id for variant in variants]
    if len(set(variantIds)) != len(variantIds):
        print(f"    Error: Two variants in {filename} have the same name.")

    # Check an image file exists in the assets directory
    recipeImage = os.path.join("assets/images/recipes", f"{filename.removesuffix(".md")}.jpg")
    if not os.path.exists(recipeImage):
        print(f"    Error: Image file {recipeImage} not found.")

    return Recipe(filename, variants)


# Uses some templates and a Recipe to generate a block of HTML
# that can be inserted into a standard "grid" div, where "grid"
# is a class used in recipes.html to layout the recipe cards
def generateRecipeCardGrid(recipes: list[Recipe], show_uploaders: bool) -> str:
    recipeCardTemplate: str = """
<div data-tags="{dataTags}" data-cook-time="{cook_time}" data-serves="{serves}">
    <h3>{name}</h3>
    <a class="image_link" href="recipes/{filename}.html">
        <img src="assets/images/recipes/{thumbnail}.jpg" alt="{name}">
    </a>
    <div class="text">{description}</div>
    <div class="recipe_tags">
        {visualTags}
    </div>
    <h5>Serves {serves} | Takes {cook_time} mins</h5>
    <a class="more_info_button" href="recipes/{filename}.html">View Recipe</a>
</div>
"""
    tagSpanTemplate: str = '<span class="tag {tag_type}">{tag}</span>'

    html: str = ""
    recipes.sort(key=lambda r: r.name) # Sort recipes alphabetically by name
    for recipe in recipes:
        # concatenate the type and dietary list lower case class names
        # These will be used to toggle visibility
        dataTags: str = recipe.original.type
        if recipe.original.dietary:
            dataTags += " " + " ".join(recipe.original.dietary)
        dataTags = dataTags.lower()
        visualTags: str = tagSpanTemplate.format(tag=recipe.original.type, tag_type="recipe_type")
        dietaryTags: list[str] = recipe.original.dietary
        dietaryTags.sort()
        for dietary in dietaryTags:
            visualTags += tagSpanTemplate.format(tag=dietary, tag_type="recipe_dietary")
        if show_uploaders:
            visualTags += tagSpanTemplate.format(tag=f"{recipe.original.uploaded_by}", tag_type="recipe_uploaded_by")
        html += recipeCardTemplate.format(dataTags=dataTags, name=recipe.name, filename=recipe.filename, thumbnail=recipe.filename, description=recipe.original.description, visualTags=visualTags, serves=recipe.original.serves, cook_time=recipe.original.cook_time)

    return html


def generateTypeFilterControls(recipes: list[Recipe]) -> str:
    types: list[str] = list(set(recipe.original.type for recipe in recipes))
    types.sort()
    filterTemplate: str = """
<input type="radio" name="type_filter" id="filter_{type}" class="type_radio" data-type="{type}" hidden {checked}>
<label for="filter_{type}" class="type_button">{type} ({count})</label>
"""
    html: str = ""
    html += filterTemplate.format(type="all", count=len(recipes), checked="checked")
    for type in types:
        count = sum(type == recipe.original.type for recipe in recipes)
        html += filterTemplate.format(type=type, count=count, checked="")
    return html

def generateDietaryFilterControls(recipes: list[Recipe]) -> str:
    dietaryOptions: list[str] = list(set(dietary for recipe in recipes for dietary in recipe.original.dietary))
    dietaryOptions.sort()
    filterTemplate: str = """
<input type="checkbox" id="filter_{dietary}" class="filter_checkbox" data-dietary="{dietary}" hidden>
<label for="filter_{dietary}" class="filter_button">{dietary} ({count})</label>
"""
    html: str = ""
    for dietary in dietaryOptions:
        count = sum(dietary in recipe.original.dietary for recipe in recipes)
        html += filterTemplate.format(dietary=dietary, count=count)
    return html


def generateCookTimeFilterControls(recipes: list[Recipe]) -> str:
    maxCookTime: int = max(recipe.original.cook_time for recipe in recipes)
    filterTemplate: str = """
<div class="slider_container">
    <label for="cooktime_slider" class="text slider_label">Takes up to <span id="cooktime_count">{max}</span> (mins)</label>
    <input type="range" id="cooktime_slider" class="filter_slider" min="0" max="{max}" step="15" value="{max}">
</div>
"""
    html = filterTemplate.format(max=maxCookTime)
    return html


def generateServesFilterControls(recipes: list[Recipe]) -> str:
    maxServes: int = max(recipe.original.serves for recipe in recipes)
    filterTemplate: str = """
<div class="slider_container">
    <label for="serves_slider" class="text slider_label">Serves at least <span id="serves_count">1</span></label>
    <input type="range" id="serves_slider" class="filter_slider" min="1" max="{max}" step="1" value="1">
</div>
"""
    html = filterTemplate.format(max=maxServes)
    return html


# Like str.format(**kwargs), but for each placeholder finds its line in the
# template and applies that line's indentation to every line of the replacement.
def indentedFormat(template: str, **kwargs) -> str:
    indented: dict = {}
    for key, value in kwargs.items():
        line = next((l for l in template.splitlines() if f"{{{key}}}" in l), None)
        if line is not None:
            indent: str = " " * (len(line) - len(line.lstrip()))
            value = str(value).replace("\n", "\n" + indent).rstrip()
        indented[key] = value
    return template.format(**indented)


def createRecipeIndexPage(recipes: list[Recipe], show_uploaders: bool):
    with open("recipes-template.html", "r") as f:
        template: str = f.read()

    outputHtml: str = indentedFormat(template,
        type_filters = generateTypeFilterControls(recipes),
        dietary_filters = generateDietaryFilterControls(recipes),
        cooktime_filters = generateCookTimeFilterControls(recipes),
        serves_filters = generateServesFilterControls(recipes),
        recipe_cards = generateRecipeCardGrid(recipes, show_uploaders),
    )

    with open("recipes.html", "w") as f:
        f.write(outputHtml)


def createRecipePage(recipe: Recipe, show_uploaders: bool):
    with open("recipes/recipe-template.html", "r") as f:
        template: str = f.read()

    # Each variant's text, ingredients and method go in a recipe_variant div,
    # and recipes.js shows the one picked with the switch
    variantSwitch: str = ""
    if len(recipe.variants) > 1:
        variantSwitch = '<div class="recipe_filters variant_switch js_enabled_only">\n'
        for variant in recipe.variants:
            checked: str = " checked" if variant is recipe.original else ""
            variantSwitch += f'    <input type="radio" name="variant" id="variant_{variant.id}" class="variant_radio" data-variant="{variant.id}" hidden{checked}>\n'
            variantSwitch += f'    <label for="variant_{variant.id}" class="type_button">{variant.name}</label>\n'
        variantSwitch += "</div>"

    preambles: str = ""
    lists: str = ""
    for variant in recipe.variants:
        hidden: str = "" if variant is recipe.original else " hidden"

        tags = f'<span class="tag recipe_type">{variant.type}</span>'
        for dietary in variant.dietary:
            tags += f'<span class="tag recipe_dietary">{dietary}</span>'
        if show_uploaders:
            tags += f'<span class="tag recipe_uploaded_by">{variant.uploaded_by}</span>'

        source: str = f'<a href="{variant.source}" target="_blank" rel="noopener noreferrer">{variant.source}</a>' if variant.source.startswith("http://") or variant.source.startswith("https://") else variant.source
        sourceHidden: str = " hidden" if not variant.source else ""

        preambles += f'<div class="recipe_variant" data-variant="{variant.id}"{hidden}>\n'
        preambles += f'    <div class="text">{variant.description}</div>\n'
        preambles += f'    <div class="text">Serves {variant.serves} | Takes {variant.cook_time} mins</div>\n'
        preambles += f'    <div class="text{sourceHidden}">Original recipe: {source}</div>\n'
        preambles += f'    <div class="recipe_tags">{tags}</div>\n'
        preambles += '</div>\n'

        lists += f'<div class="recipe_variant" data-variant="{variant.id}"{hidden}>\n'
        lists += '    <div class="pair">\n'
        lists += '        <div class="box">\n'
        lists += '            <h3>Ingredients</h3>\n'
        lists += '            <ul>\n'
        for ingredient in variant.ingredients:
            lists += f'                <li><input type="checkbox" class="ingredient_checkbox"><label>{ingredient}</label></li>\n'
        lists += '            </ul>\n'
        lists += '        </div>\n'
        lists += '        <div class="two_thirds box">\n'
        lists += '            <h3>Method</h3>\n'
        lists += '            <ol>\n'
        for step in variant.method:
            lists += f'                <li><input type="checkbox" class="method_checkbox"><label>{step}</label></li>\n'
        lists += '            </ol>\n'
        lists += '        </div>\n'
        lists += '    </div>\n'
        lists += '</div>\n'

    outputHtml: str = indentedFormat(template,
        title = recipe.name,
        image = f"../assets/images/recipes/{recipe.filename}.jpg",
        variant_switch = variantSwitch,
        preambles = preambles,
        lists = lists,
    )

    with open(f"recipes/{recipe.filename}.html", "w") as f:
        f.write(outputHtml)


if __name__ == "__main__":
    recipesDir: str = "assets/data/recipes"
    recipes: list[Recipe] = []
    for filename in os.listdir(recipesDir):
        if filename.endswith(".md"):
            print(f"Parsing {filename}...")
            recipes.append(parseRecipeMarkdown(os.path.join(recipesDir, filename)))

    unique_uploader_count = len(set(recipe.original.uploaded_by for recipe in recipes))
    show_uploaders = unique_uploader_count > 1
    
    createRecipeIndexPage(recipes, show_uploaders)

    for recipe in recipes:
        print(f"Creating page for {recipe.name}...")
        createRecipePage(recipe, show_uploaders)

