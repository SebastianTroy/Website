# ##################################################################### #
# autoHeader.py can be run to automatically insert the header, toolbar, #
# and footer into all HTML files in the current directory and the godot #
# directory. It also ensures that all youtube links are uniform.        #
# ##################################################################### #

import os
# pip3 install requests
import requests

from enum import Enum

class Section(Enum):
    NONE = 0
    HEADER = 1
    TOOLBAR = 2
    FOOTER = 3
    SURPLUS = 4

def main():
    print("Running autoHeader.py")
    headerString, toolbarString, footerString = getTemplateSections()
    processFiles(".", headerString, toolbarString, footerString)
    processFiles("./godot", headerString, toolbarString, footerString)

def processFiles(dir: str, headerString: str, toolbarString: str, footerString: str):
    for filename in filter(lambda s: s.endswith(".html") and not s.startswith("template"), os.listdir(dir)):
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
                        reconstructedDOM = reconstructedDOM.replace("        <!-- font -->\n", getCustomFontEntry(filename))
                        reconstructedDOM = reconstructedDOM.replace("        <!-- style -->\n", getCustomStyleEntry(filename))
                        reconstructedDOM = reconstructedDOM.replace("        <!-- script -->\n", getCustomScriptEntry(filename))
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



def getCustomFontEntry(filename: str) -> str:
    fontFilename = "assets/fonts/" + filename.removesuffix(".html") + ".css"
    if os.path.exists(fontFilename):
        return '        <link rel="stylesheet" href="' + fontFilename + '">\n'
    return ""



def getCustomStyleEntry(filename: str) -> str:
    styleFilename = "assets/styles/" + filename.removesuffix(".html") + ".css"
    if os.path.exists(styleFilename):
        return '        <link rel="stylesheet" href="' + styleFilename + '">\n'
    return ""



def getCustomScriptEntry(filename: str) -> str:
    scriptFilename = "assets/scripts/" + filename.removesuffix(".html") + ".js"
    if os.path.exists(scriptFilename):
        return '        <script src="' + scriptFilename + '"></script>\n'
    return ""



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
    if not os.path.exists(link):
        print(linkLocation + " Broken internal link: " + link)



def checkWebLink(link: str, linkLocation: str, enclosingTag: str):
    if "http://" in link:
        print(linkLocation + " Insecure link: " + link + " (use https)")
    if "youtube.com" in link:
        print(linkLocation + " Insecure link: " + link + " (use youtube-nocookie)")
    if "href" in enclosingTag and "target" not in enclosingTag:
        print(linkLocation + " Missing target attribute: " + link + " (use target='_blank')")
    if "href" in enclosingTag and "noopener noreferrer" not in enclosingTag:
        print(linkLocation + " Inscure link: " + link + " (use rel='noopener noreferrer')")
    # TODO consider iframe security
    try:
        response = requests.get(link)
        if response.status_code != 200:
            raise Exception("HTTP status code: " + str(response.status_code))
    except Exception as e:
        print(linkLocation + " Broken external link: " + link + ": " + str(e))



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
                            checkWebLink(link, linkLocation, surroundingTag)
                        else:
                            checkLocalLink(os.path.join(pageDirectory, link), linkLocation)
        if c == "\n":
            currentLine += 1
            currentCharacter = 1
        else:
            currentCharacter += 1



main()
