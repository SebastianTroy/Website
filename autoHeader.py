# ##################################################################### #
# autoHeader.py can be run to automatically insert the header, toolbar, #
# and footer into all HTML files in the current directory and the godot #
# directory. It also ensures that all youtube links are uniform.        #
# ##################################################################### #

import os
import re
# pip3 install requests
import requests
import aiohttp
import asyncio

from enum import Enum

class Section(Enum):
    NONE = 0
    HEADER = 1
    TOOLBAR = 2
    FOOTER = 3
    SURPLUS = 4

# Used to collect all tasks for checking web links, so we can run them asynchronously at the end
# This prevents a worst case scenario of an 8 second timeout for each web link
web_link_tasks = []

def main():
    print("Running autoHeader.py")
    headerString, toolbarString, footerString = getTemplateSections()
    global downloadsTemplate
    with open("downloads-template.html", "r") as downloadsFile:
        downloadsTemplate = downloadsFile.read()
    processFiles(".", headerString, toolbarString, footerString)
    processFiles("./godot", headerString, toolbarString, footerString)
    processFiles("./recipes", headerString, toolbarString, footerString)
    asyncio.run(run_all_web_checks())

def processFiles(dir: str, headerString: str, toolbarString: str, footerString: str):
    for filename in filter(lambda s: s.endswith(".html") and not s.endswith("template.html"), os.listdir(dir)):
        print(filename)
        reconstructedDOM: str = ""
        with open(os.path.join(dir, filename), "r+") as webpageFile:
            currentSection = Section.NONE
            for line in webpageFile:
                # Insert the header and footer, along with any custom font/css/script files
                if line == "    <head>\n":
                    currentSection = Section.HEADER
                elif line == '        <div class="toolbar">\n':
                    currentSection = Section.TOOLBAR
                elif line == '        <div class="footer">\n':
                    currentSection = Section.FOOTER

                match currentSection:
                    case Section.HEADER:
                        reconstructedDOM += headerString
                        reconstructedDOM = reconstructedDOM.replace("<title>TroyDev</title>", "<title>" + filenameToTitle(filename) + " | TroyDev</title>")
                        reconstructedDOM = reconstructedDOM.replace("        <!-- font -->\n", getCustomFontEntry(dir, filename))
                        reconstructedDOM = reconstructedDOM.replace("        <!-- style -->\n", getCustomStyleEntry(dir, filename))
                        reconstructedDOM = reconstructedDOM.replace("        <!-- script -->\n", getCustomScriptEntry(dir, filename))
                        currentSection = Section.SURPLUS
                    case Section.TOOLBAR:
                        reconstructedDOM += toolbarString
                        currentSection = Section.SURPLUS
                    case Section.FOOTER:
                        reconstructedDOM += footerString
                        currentSection = Section.SURPLUS
                    case Section.NONE:
                        reconstructedDOM += line
                    case _:
                        pass

                if line == "    </head>\n" or line == "        </div>\n":
                    currentSection = Section.NONE

            reconstructedDOM = fillDownloads(reconstructedDOM)

            if dir != ".":
                reconstructedDOM = reconstructedDOM.replace('href="assets', 'href="../assets')
                reconstructedDOM = reconstructedDOM.replace('src="assets', 'src="../assets')
                reconstructedDOM = reconstructedDOM.replace('href="' + dir + "/", 'href="')
                reconstructedDOM = reconstructedDOM.replace('src="' + dir + "/", 'src="')
                reconstructedDOM = reconstructedDOM.replace('<a class="toolbar_button" href="', '<a class="toolbar_button" href="../')
                reconstructedDOM = reconstructedDOM.replace('<a class="toolbar_logo" href="', '<a class="toolbar_logo" href="../')

            checkLinks(filename, reconstructedDOM, dir)

            webpageFile.seek(0, 0)
            webpageFile.write(reconstructedDOM)
            webpageFile.truncate()



def getCustomFontEntry(dir: str, filename: str) -> str:
    if filename.endswith("-template.html"):
        filename = filename.removesuffix("-template.html") + ".html"
    customFontEntry: str = ""
    fontFilenameFromPage = "assets/fonts/" + filename.removesuffix(".html") + ".css"
    fontFilenameFromDir = "assets/fonts/" + os.path.normpath(dir) + ".css"
    if os.path.exists(fontFilenameFromPage):
        customFontEntry += '        <link rel="stylesheet" href="' + fontFilenameFromPage + '">\n'
    if os.path.exists(fontFilenameFromDir):
        customFontEntry += '        <link rel="stylesheet" href="' + fontFilenameFromDir + '">\n'
    return customFontEntry



def getCustomStyleEntry(dir: str, filename: str) -> str:
    if filename.endswith("-template.html"):
        filename = filename.removesuffix("-template.html") + ".html"
    customStyleEntry: str = ""
    styleFilenameFromPage = "assets/styles/" + filename.removesuffix(".html") + ".css"
    styleFilenameFromDir = "assets/styles/" + os.path.normpath(dir) + ".css"
    if os.path.exists(styleFilenameFromPage):
        customStyleEntry += '        <link rel="stylesheet" href="' + styleFilenameFromPage + '">\n'
    if os.path.exists(styleFilenameFromDir):
        customStyleEntry += '        <link rel="stylesheet" href="' + styleFilenameFromDir + '">\n'
    return customStyleEntry



def getCustomScriptEntry(dir: str, filename: str) -> str:
    if filename.endswith("-template.html"):
        filename = filename.removesuffix("-template.html") + ".html"
    customScriptEntry: str = ""
    scriptFilenameFromPage = "assets/scripts/" + filename.removesuffix(".html") + ".js"
    scriptFilenameFromDir = "assets/scripts/" + os.path.normpath(dir) + ".js"
    if os.path.exists(scriptFilenameFromPage):
        customScriptEntry += '        <script src="' + scriptFilenameFromPage + '"></script>\n'
    if os.path.exists(scriptFilenameFromDir):
        customScriptEntry += '        <script src="' + scriptFilenameFromDir + '"></script>\n'
    return customScriptEntry



def filenameToTitle(filename: str) -> str:
    # Exception for index.html
    if filename == "index.html":
        return "Projects"

    # Don't simply use title(), as it un capitailises acronyms like RGB
    title: str = ""
    for word in filename.replace("-", " ").removesuffix(".html").split(" "):
        if len(title) > 0:
            title += " "
        word = word[0].capitalize() + word[1:]
        title += word
    return title



# Matches a downloads section, from its opening tag to the closing tag at the same indent
DOWNLOADS_PATTERN = re.compile(r'^( *)<div class="downloads"([^>]*)>\n.*?^\1</div>\n', re.MULTILINE | re.DOTALL)

# Rewrites each <div class="downloads" data-name=... data-title=... data-windows=... data-linux=...>
# from downloads-template.html, so every page's Download it section looks the same.
# A page only needs the opening and closing tags with those attributes, the contents are filled in.
def fillDownloads(page: str) -> str:
    def fill(match: re.Match) -> str:
        indent = match.group(1)
        values = dict(re.findall(r'data-([a-z]+)="([^"]*)"', match.group(2)))
        filled = downloadsTemplate.format(**values)
        return "".join(indent + line if line.strip() else line for line in filled.splitlines(keepends=True))
    return DOWNLOADS_PATTERN.sub(fill, page)



def getTemplateSections() -> tuple[str, str, str]:
    headerString: str = ""
    toolbarString: str = ""
    footerString: str = ""

    currentSection = Section.NONE
    with open("template.html", "r") as templateFile:
        for line in templateFile:
            if line == "    <head>\n":
                currentSection = Section.HEADER
            elif line == '        <div class="toolbar">\n':
                currentSection = Section.TOOLBAR
            elif line == '        <div class="footer">\n':
                currentSection = Section.FOOTER

            match currentSection:
                case Section.HEADER:
                    headerString += line
                case Section.TOOLBAR:
                    toolbarString += line
                case Section.FOOTER:
                    footerString += line
                case _:
                    pass

            if line == "    </head>\n" or line == "        </div>\n":
                currentSection = Section.NONE

    return headerString, toolbarString, footerString



def checkLocalLink(link: str, linkLocation: str):
    path, _, fragment = link.partition("#")
    if not os.path.exists(path):
        print(" >>> " + linkLocation + " Broken internal link: " + link)
    elif fragment and not linkTargetExists(path, fragment):
        print(" >>> " + linkLocation + " Broken internal link, no such anchor or variant: " + link)


# A fragment can name an element's id, or a recipe variant, which recipes.js shows when the hash matches a .variant_radio's data-variant
def linkTargetExists(path: str, fragment: str) -> bool:
    if os.path.isdir(path):
        path = os.path.join(path, "index.html")
    with open(path, "r") as page:
        html = page.read()
    return re.search('id="' + re.escape(fragment) + '"', html) is not None or re.search('class="variant_radio" data-variant="' + re.escape(fragment) + '"', html) is not None



async def checkWebLink(session, link: str, linkLocation: str, enclosingTag: str):
    if "http://" in link:
        print(" >>> " + linkLocation + " Insecure link: " + link + " (use https)")
    if "youtube.com" in link:
        print(" >>> " + linkLocation + " Insecure link: " + link + " (use youtube-nocookie)")
    if "href" in enclosingTag and "target" not in enclosingTag:
        print(" >>> " + linkLocation + " Missing target attribute: " + link + " (use target='_blank')")
    if "href" in enclosingTag and "noopener noreferrer" not in enclosingTag:
        print(" >>> " + linkLocation + " Inscure link: " + link + " (use rel='noopener noreferrer')")
    # TODO consider iframe security
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'}
        async with session.get(link, headers=headers, timeout=8) as response:
            if response.status != 200:
                raise Exception("HTTP status code: " + str(response.status))
    except Exception as e:
        print(" >>> " + linkLocation + " Broken external link: " + link + ": " + str(e))



def checkLinks(pageName: str, pageData: str, pageDirectory: str):
    class State(Enum):
        SEEKING_OPEN = 1,
        SEEKING_CLOSE = 2,

    currentLine: int = 1
    currentCharacter: int = 1
    currentState: State = State.SEEKING_OPEN
    openIndex: int = 0
    closeIndex: int = 0
    for index, c in enumerate(pageData):
        match currentState:
            case State.SEEKING_OPEN:
                if c == '"':
                    openIndex = index
                    currentState = State.SEEKING_CLOSE
            case State.SEEKING_CLOSE:
                if c == '"':
                    closeIndex = index
                    currentState = State.SEEKING_OPEN

                    attributeBeginIndex = pageData.rfind(" ", None, openIndex)
                    attributeName = pageData[attributeBeginIndex + 1 : openIndex - 1]
                    link: str = pageData[openIndex + 1: closeIndex]

                    if attributeName in [ "href", "src" ]:
                        # Formatted so we can ctrl + click in vscode
                        linkLocation: str = pageName + ":" + str(currentLine) + ":" + str(currentCharacter)
                        if any(substring in link for substring in ["http", "https", "www"]):
                            # And grab the enclosing tag for additional security checks
                            tagBeginIndex = pageData.rfind("<", None, openIndex)
                            tagEndIndex = pageData.find(">", closeIndex)
                            surroundingTag = pageData[tagBeginIndex : tagEndIndex + 1]
                            web_link_tasks.append((link, linkLocation, surroundingTag))
                        else:
                            checkLocalLink(os.path.join(pageDirectory, link), linkLocation)
        if c == "\n":
            currentLine += 1
            currentCharacter = 1
        else:
            currentCharacter += 1



async def run_all_web_checks():
    print("Running {count} web link checks...".format(count=len(web_link_tasks)))
    async with aiohttp.ClientSession() as session:
        tasks = [checkWebLink(session, link, loc, tag) for link, loc, tag in web_link_tasks]
        await asyncio.gather(*tasks)



if __name__  == "__main__":
    main()
