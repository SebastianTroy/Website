import os

from enum import Enum

class Section(Enum):
    NONE = 0
    HEADER = 1
    TOOLBAR = 2
    FOOTER = 3
    SURPLUS = 4

def main():
    headerString, toolbarString, footerString = getTemplateSections()

    for filename in filter(lambda s: s.endswith(".html") and not s.startswith("template"), os.listdir(".")):
        reconstructedDOM: str = ""
        with open(filename, "r+") as webpageFile:
            currentSection = Section.NONE
            for line in webpageFile:
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
        return '        <script src="assets/scripts/toolbar.js' + scriptFilename + '"></script>\n'
    return ""



def filenameToTitle(filename: str) -> str:
    # Exception for index.html
    if filename == "index.html":
        return "Home"

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



main()
