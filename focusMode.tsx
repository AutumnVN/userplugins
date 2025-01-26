/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Menu } from "@webpack/common";
import { Channel, Guild } from "discord-types/general";

const SortedGuildStore = findStoreLazy("SortedGuildStore");
const PrivateChannelSortStore = findStoreLazy("PrivateChannelSortStore");
const PrivateChannelReadStateStore = findStoreLazy("PrivateChannelReadStateStore");

let updateSortedGuildStore: () => void;
let updatePrivateChannelReadStateStore: () => void;

const settings = definePluginSettings({
    focusMode: {
        description: "Enable focus mode",
        type: OptionType.BOOLEAN,
        onChange,
        default: false
    },
    serverWhitelist: {
        description: "Servers to keep when focus mode is enabled",
        type: OptionType.STRING,
        default: ""
    },
    dmWhitelist: {
        description: "DMs to keep when focus mode is enabled",
        type: OptionType.STRING,
        default: ""
    },
});

export default definePlugin({
    name: "FocusMode",
    description: "Hide & mute all servers and DMs except the whitelisted ones",
    authors: [Devs.AutumnVN],
    settings,
    contextMenus: {
        "guild-context": toggleServerWhitelist,
        "user-context": toggleDmWhitelist,
        "gdm-context": toggleDmWhitelist
    },
    toolboxActions: {
        "Toggle Focus Mode"() {
            settings.store.focusMode = !settings.store.focusMode;
            onChange();
        }
    },
    start() {
        if (settings.store.focusMode) onChange();
    },
    set updateSortedGuildStore(e) {
        updateSortedGuildStore = e;
    },
    set updatePrivateChannelReadStateStore(e) {
        updatePrivateChannelReadStateStore = e;
    },
    patches: [{
        find: '"SortedGuildStore"',
        replacement: [{
            match: /for\(let (\i) in \i\.\i\.getGuilds\(\)\)/,
            replace: "$& !($self.settings.store.focusMode && !($self.settings.store.serverWhitelist.includes($1) || !$1)) &&"
        }, {
            match: /!\i\.\i\.isUnavailable\((\i\.id)\)/,
            replace: "$& || $self.settings.store.focusMode && !$self.settings.store.serverWhitelist.includes($1)"
        }, {
            match: /function (\i)\(\)\{.+?\.getGuildFolders\(\)\)&&/,
            replace: "$self.updateSortedGuildStore=$1;$&"
        }]
    }, {
        find: '"UserGuildSettingsStore"',
        replacement: [{
            match: /isMuted\((\i)\){/,
            replace: "$& if ($self.settings.store.focusMode && !($self.settings.store.serverWhitelist.includes($1) || !$1)) return true;"
        }, {
            match: /isChannelMuted\(\i,(\i)\){/,
            replace: "$& if ($self.settings.store.focusMode && !($self.settings.store.dmWhitelist.includes($1))) return true;"
        }]
    }, {
        find: '"GuildsBar"',
        replacement: [{
            match: /\.setNodeRef,draggable:!0/g,
            replace: "$& && !$self.settings.store.focusMode"
        }]
    }, {
        find: '"PrivateChannelSortStore"',
        replacement: [{
            match: /getPrivateChannelIds\(\)\{return (\i)\(\)/g,
            replace: "$&.filter(id => !($self.settings.store.focusMode && !$self.settings.store.dmWhitelist.includes(id)))"
        }]
    }, {
        find: '"PrivateChannelReadStateStore"',
        replacement: [{
            match: /getUnreadPrivateChannelIds\(\)\{return (\i)/g,
            replace: "$&.filter(id => !($self.settings.store.focusMode && !$self.settings.store.dmWhitelist.includes(id)))"
        }, {
            match: /function (\i)\(\)\{.+?\.getPrivateChannelIds\(\)\.filter/,
            replace: "$self.updatePrivateChannelReadStateStore=$1;$&"
        }]
    }]
});

function onChange() {
    updateSortedGuildStore();
    SortedGuildStore.emitChange();
    PrivateChannelSortStore.emitChange();
    updatePrivateChannelReadStateStore();
    PrivateChannelReadStateStore.emitChange();
}

function toggleServerWhitelist(children, { guild }: { guild: Guild; }) {
    if (!guild || settings.store.focusMode) return;

    children.splice(-1, 0,
        <Menu.MenuItem
            id="vc-focus-mode-toggle-server-whitelist"
            label={settings.store.serverWhitelist.includes(guild.id) ? "Remove from focus mode" : "Add to focus mode"}
            action={() => {
                settings.store.serverWhitelist = settings.store.serverWhitelist.includes(guild.id)
                    ? settings.store.serverWhitelist.split(",").filter(id => id !== guild.id).join(",")
                    : settings.store.serverWhitelist.split(",").concat(guild.id).join(",");
            }}
        />
    );
}

function toggleDmWhitelist(children, { channel }: { channel: Channel; }) {
    if (!channel || !(channel.isDM() || channel.isGroupDM()) || settings.store.focusMode) return;

    children.splice(-1, 0,
        <Menu.MenuItem
            id="vc-focus-mode-toggle-dm-whitelist"
            label={settings.store.dmWhitelist.includes(channel.id) ? "Remove from focus mode" : "Add to focus mode"}
            action={() => {
                settings.store.dmWhitelist = settings.store.dmWhitelist.includes(channel.id)
                    ? settings.store.dmWhitelist.split(",").filter(id => id !== channel.id).join(",")
                    : settings.store.dmWhitelist.split(",").concat(channel.id).join(",");
            }}
        />
    );
}
