/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoAutoChannelNotificationSettings",
    description: 'fuck you discord i didnt ask you to auto change my notification settings. "maybeAutoUpgradeChannel" huh? why dont you auto upgrade your dick instead of my channel settings',
    authors: [Devs.AutumnVN],
    patches: [
        {
            find: "}maybeAutoUpgradeChannel",
            replacement: {
                match: /maybeAutoUpgradeChannel\(\i\){/,
                replace: "$&return;"
            }
        }
    ]
});
