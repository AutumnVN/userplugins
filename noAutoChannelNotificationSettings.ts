/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoAutoChannelNotificationSettings",
    description: "a",
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
