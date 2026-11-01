#!/usr/bin/env python3
"""Exercise the real extension in a private Shell; never open the user's Gradia."""
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix="screenshot-launcher-test-") as directory:
    private = Path(directory)
    helpers = private / "bin"
    helpers.mkdir()
    flatpak = helpers / "flatpak"
    flatpak.write_text(
        "#!/usr/bin/python3\nimport json, os, sys\n"
        "from pathlib import Path\n"
        "Path(os.environ['SCREENSHOT_TEST_RECORD']).write_text(json.dumps(sys.argv[1:]))\n"
    )
    flatpak.chmod(0o700)
    bundle = private / "extension.zip"
    extension = ROOT / "screenshot-tool-launcher@markevich.org"
    with zipfile.ZipFile(bundle, "w") as archive:
        for source in extension.rglob("*"):
            if source.is_file():
                archive.write(source, source.relative_to(extension))
    result = subprocess.run(
        ["timeout", "--kill-after=5", "30", "dbus-run-session", "--",
         "gnome-shell-test-tool", "--headless", "--extension", str(bundle),
         str(ROOT / "tests/smoke.js")],
        env=dict(os.environ, XDG_RUNTIME_DIR=directory,
                 XDG_CONFIG_HOME=str(private / "config"), GSETTINGS_BACKEND="memory",
                 WAYLAND_DISPLAY="gnome-shell-test-display", LIBGL_ALWAYS_SOFTWARE="1",
                 PATH=f"{helpers}:{os.environ['PATH']}",
                 SCREENSHOT_TEST_RECORD=str(private / "launch.json")),
        capture_output=True, text=True,
    )
    if result.returncode or "SCREENSHOT_LAUNCHER_SMOKE_OK" not in result.stdout:
        print(result.stdout[-6000:] + result.stderr[-6000:])
        raise SystemExit(1)
    print("SCREENSHOT_LAUNCHER_SMOKE_OK")
