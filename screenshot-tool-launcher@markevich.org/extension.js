import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class ScreenshotToolLauncherExtension extends Extension {
    enable() {
        this._lifetime = {};
        this._pendingNotification = null;
        this._screenshotSource = null;
        Main.screenshotUI.connectObject('screenshot-taken',
            (_ui, file) => this._onScreenshotTaken(file), this);
        Main.messageTray.connectObject('source-added',
            (_tray, source) => this._onSourceAdded(source), this);
        for (const source of Main.messageTray.getSources())
            this._onSourceAdded(source);
    }

    disable() {
        this._lifetime = null;
        Main.screenshotUI.disconnectObject(this);
        Main.messageTray.disconnectObject(this);
        this._screenshotSource?.disconnectObject(this);
        this._screenshotSource = null;
        this._pendingNotification = null;
    }

    _onSourceAdded(source) {
        if (!(source.icon instanceof Gio.ThemedIcon) ||
            !source.icon.get_names().some(name =>
                name.startsWith('screenshot') || name.startsWith('screenshooter')) ||
            this._screenshotSource === source)
            return;
        this._screenshotSource?.disconnectObject(this);
        this._screenshotSource = source;
        source.connectObject(
            'notification-added', (_source, notification) => {
                // Shell adds the notification before emitting screenshot-taken.
                this._pendingNotification = notification;
            },
            'destroy', () => {
                this._screenshotSource = null;
                this._pendingNotification = null;
            }, this);
    }

    _onScreenshotTaken(file) {
        const notification = this._pendingNotification;
        this._pendingNotification = null;
        const lifetime = this._lifetime;
        notification?.addAction('Annotate', () => {
            if (this._lifetime === lifetime)
                this._open(file);
        });
    }

    _open(file) {
        const lifetime = this._lifetime;
        try {
            const process = Gio.Subprocess.new([
                'flatpak', 'run', '--file-forwarding',
                'be.alexandervanhee.gradia', '@@', file.get_path(), '@@',
            ], Gio.SubprocessFlags.NONE);
            process.wait_check_async(null, (child, result) => {
                try {
                    child.wait_check_finish(result);
                } catch (error) {
                    if (this._lifetime === lifetime)
                        this._launchError(error);
                }
            });
        } catch (error) {
            this._launchError(error);
        }
    }

    _launchError(error) {
        console.error(`Screenshot Tool Launcher: ${error.message}`);
        Main.notifyError('Could not open Gradia',
            'Check that Gradia is installed and try opening the screenshot again.');
    }
}
