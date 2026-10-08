# Publishes a Godot web export (dlink, no threads) to godot/<Game>/, sharing the engine between games.
#   python3 publishGodot.py <export folder> <Game> [--clean]
# The engine files (.js, .wasm, .side.wasm, audio worklets) are identical for every game made with the
# same Godot build, so they live once in godot/engine-<version>/ and each game's HTML points at them.
# Only the game's own files (.html, .pck, GDExtension .wasm, icons) are copied to godot/<Game>/.
# --clean deletes files in godot/<Game>/ that this export no longer needs, such as an old engine copy.

import json
import os
import re
import shutil
import sys
import filecmp

GODOT_DIRECTORY = "godot"
ENGINE_SUFFIXES = [".js", ".wasm", ".side.wasm", ".audio.worklet.js", ".audio.position.worklet.js"]


def fail(message: str):
    print("Error: " + message)
    sys.exit(1)


# The version string Godot builds into its engine, e.g. 4.7.2.stable.official
def engineVersion(sideWasm: str) -> str:
    with open(sideWasm, "rb") as file:
        found = re.search(rb"(\d+\.\d+(?:\.\d+)?)\.stable", file.read())
    if found is None:
        fail("Couldn't find the Godot version in " + sideWasm)
    return found.group(1).decode()


def publish(exportDirectory: str, game: str, clean: bool):
    # Symlinks, such as an index.html pointing at the export's page, are skipped
    names = [name for name in os.listdir(exportDirectory) if not os.path.islink(os.path.join(exportDirectory, name))]
    htmlFiles = [name for name in names if name.endswith(".html")]
    if len(htmlFiles) != 1:
        fail("Expected one .html in " + exportDirectory + ", found " + str(htmlFiles))
    html = open(os.path.join(exportDirectory, htmlFiles[0])).read()
    configMatch = re.search(r"const GODOT_CONFIG = (\{.*?\});\n", html)
    if configMatch is None:
        fail("No GODOT_CONFIG in " + htmlFiles[0])
    config = json.loads(configMatch.group(1))
    executable = config["executable"]
    if not os.path.exists(os.path.join(exportDirectory, executable + ".side.wasm")):
        fail("No " + executable + ".side.wasm: only dlink exports without threads can share an engine")

    version = engineVersion(os.path.join(exportDirectory, executable + ".side.wasm"))
    engineDirectory = os.path.join(GODOT_DIRECTORY, "engine-" + version)
    others = sorted(name for name in os.listdir(GODOT_DIRECTORY) if name.startswith("engine-") and name != "engine-" + version)
    if others:
        print("Warning: this export uses Godot " + version + ", but other engine folders exist too: " + ", ".join(others))

    # The shared engine: copied the first time, and from then on checked to be identical
    os.makedirs(engineDirectory, exist_ok=True)
    for suffix in ENGINE_SUFFIXES:
        source = os.path.join(exportDirectory, executable + suffix)
        target = os.path.join(engineDirectory, "godot" + suffix)
        if not os.path.exists(target):
            shutil.copyfile(source, target)
            print("Added " + target)
        elif not filecmp.cmp(source, target, shallow=False):
            fail(source + " differs from " + target + ": a different build of Godot " + version + "? Re-export the other games with the same build, or remove the engine folder")

    # The game's own files
    gameDirectory = os.path.join(GODOT_DIRECTORY, game)
    os.makedirs(gameDirectory, exist_ok=True)
    engineFiles = {executable + suffix for suffix in ENGINE_SUFFIXES}
    gameFiles = {game + ".html"}
    for name in names:
        if name in engineFiles or name == htmlFiles[0]:
            continue
        shutil.copyfile(os.path.join(exportDirectory, name), os.path.join(gameDirectory, name))
        gameFiles.add(name)

    # Point the page at the shared engine. The loader finds the .wasm, .side.wasm and worklets from
    # "executable"; the .pck and GDExtension libraries stay relative to the page.
    enginePath = "../engine-" + version + "/godot"
    config["mainPack"] = executable + ".pck"
    config["executable"] = enginePath
    config["fileSizes"] = {
        executable + ".pck": os.path.getsize(os.path.join(exportDirectory, executable + ".pck")),
        enginePath + ".wasm": os.path.getsize(os.path.join(engineDirectory, "godot.wasm")),
    }
    html = html.replace(configMatch.group(1), json.dumps(config, separators=(",", ":")))
    html = html.replace('<script src="' + executable + '.js"></script>', '<script src="' + enginePath + '.js"></script>')
    if enginePath + ".js" not in html:
        fail("Couldn't find the engine's <script> tag in " + htmlFiles[0])
    with open(os.path.join(gameDirectory, game + ".html"), "w") as file:
        file.write(html)

    leftovers = sorted(set(os.listdir(gameDirectory)) - gameFiles)
    for name in leftovers:
        if clean:
            os.remove(os.path.join(gameDirectory, name))
            print("Removed " + os.path.join(gameDirectory, name))
        else:
            print("Not needed any more (run with --clean to remove): " + os.path.join(gameDirectory, name))
    print("Published " + game + " on Godot " + version)


if __name__ == "__main__":
    arguments = [argument for argument in sys.argv[1:] if argument != "--clean"]
    if len(arguments) != 2:
        fail("Usage: python3 publishGodot.py <export folder> <Game> [--clean]")
    publish(arguments[0], arguments[1], "--clean" in sys.argv)
