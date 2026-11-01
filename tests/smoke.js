import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

export const METRICS = {};
const UUID = 'screenshot-tool-launcher@markevich.org';
const wait = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
    resolve();
    return GLib.SOURCE_REMOVE;
}));
const check = (condition, message) => { if (!condition) throw new Error(message); };

async function screenshot(iconName, expectAction, activate = true) {
    const source = new MessageTray.Source({title: 'Screenshot fixture', iconName});
    Main.messageTray.add(source);
    const notification = new MessageTray.Notification({source, title: 'Screenshot fixture'});
    const actions = [];
    notification.connect('action-added', (_, action) => actions.push(action));
    source.addNotification(notification);
    const path = GLib.build_filenamev([GLib.get_user_runtime_dir(), `screenshot '${GLib.get_monotonic_time()} with spaces.png`]);
    Main.screenshotUI.emit('screenshot-taken', Gio.File.new_for_path(path));
    check(actions.length === (expectAction ? 1 : 0), `Expected action count for ${iconName}`);
    if (expectAction && activate) {
        check(actions[0].label === 'Annotate', 'Keep the Annotate label');
        const record = Gio.File.new_for_path(GLib.getenv('SCREENSHOT_TEST_RECORD'));
        if (record.query_exists(null))
            record.delete(null);
        actions[0].activate();
        for (let attempt = 0; attempt < 30 && !record.query_exists(null); attempt++)
            await wait(50);
        const [, bytes] = record.load_contents(null);
        const argv = JSON.parse(new TextDecoder().decode(bytes));
        check(JSON.stringify(argv) === JSON.stringify([
            'run', '--file-forwarding', 'be.alexandervanhee.gradia', '@@', path, '@@',
        ]), 'Forward the screenshot path to Gradia as one argument');
    }
    if (!activate)
        return {source, action: actions[0]};
    if (!expectAction)
        source.destroy();
}

export async function run() {
    await wait(500);
    await screenshot('screenshot-symbolic', true);
    await screenshot('screenshooter-symbolic', true);
    await screenshot('mail-symbolic', false);
    const retained = await screenshot('screenshot-symbolic', true, false);
    Main.extensionManager.disableExtension(UUID);
    await screenshot('screenshot-symbolic', false);
    Main.extensionManager.enableExtension(UUID);
    await wait(300);
    const record = Gio.File.new_for_path(GLib.getenv('SCREENSHOT_TEST_RECORD'));
    record.delete(null);
    retained.action.activate();
    await wait(200);
    check(!record.query_exists(null), 'Old notification actions must stay inactive after re-enable');
    await screenshot('screenshot-symbolic', true);
    print('SCREENSHOT_LAUNCHER_SMOKE_OK');
}
