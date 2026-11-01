# Screenshot Tool Launcher

A personal adaptation of [Michael Markevich’s extension](https://github.com/michael-markevich/screenshot-tool-launcher).
Adds **Annotate** to GNOME screenshot notifications and opens the image in the
Gradia Flatpak (`be.alexandervanhee.gradia`). There are no preferences.
The original MIT license is retained in [LICENSE](LICENSE).

## Install

Install Gradia, then copy the extension:

```sh
flatpak install flathub be.alexandervanhee.gradia
extension_dir="$HOME/.local/share/gnome-shell/extensions/screenshot-tool-launcher@markevich.org"
mkdir -p "$extension_dir"
cp screenshot-tool-launcher@markevich.org/{extension.js,metadata.json} "$extension_dir/"
```

When replacing the original extension, remove its old `prefs.js` and `schemas/`
from that installation directory. Its saved settings are unused.
Sign out and back in, then enable it:

```sh
gnome-extensions enable screenshot-tool-launcher@markevich.org
```

The metadata declares GNOME Shell 47–51 compatibility. The notification and
launch checks have been run on GNOME 50; GNOME 51 still needs a runtime check.

## Check changes

With `gnome-shell-test-tool` installed:

```sh
python3 tests/run.py
```

This uses a separate headless compositor and a fake Flatpak command. It checks
notification actions, Gradia arguments, and disable/re-enable without opening
Gradia or changing the live desktop.
