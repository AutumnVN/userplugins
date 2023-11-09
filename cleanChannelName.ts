/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "discord-types/general";

export default definePlugin({
    name: "CleanChannelName",
    authors: [Devs.AutumnVN],
    description: "remove all shit from channel names",
    patches: [
        {
            find: "loadAllGuildAndPrivateChannelsFromDisk(){",
            replacement: {
                match: /(?<=getChannel\(\i\)\{if\(null!=\i\)return )\i\(\i\)/,
                replace: "$self.cleanChannelName($&)",
            }
        }
    ],

    cleanChannelName(channel?: Channel) {
        if (channel) channel.name = channel.name.replace(/-?[^a-zA-Z0-9\u00C0-\u1EF9 -:]-?/ug, "");
        return channel;
    }
});
