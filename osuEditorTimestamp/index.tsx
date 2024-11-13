/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
const Native = VencordNative.pluginHelpers["osu!EditorTimestamp"] as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "osu!EditorTimestamp",
    description: "clickable osu! editor timestamp",
    authors: [Devs.AutumnVN],
    patches: [
        {
            find: "roleMention:{order:",
            replacement: {
                match: /roleMention:\{order:(\i\.\i\.order)/,
                replace: "osuTimestamp:$self.osuTimestamp($1),$&"
            }
        },
        {
            find: "Unknown markdown rule:",
            replacement: {
                match: /roleMention:{type:/,
                replace: 'osuTimestamp:{type:"inlineObject"},$&',
            }
        }
    ],
    osuTimestamp(order: number) {
        const timestampRegex = /^\b(((\d{2,}):([0-5]\d)[:.](\d{3}))(\s\((?:\d+[,|])*\d+\))?)/;

        return {
            order,
            requiredFirstCharacters: "0123456789".split(""),
            match: content => timestampRegex.exec(content),
            parse(match, _, props) {
                if (!props.messageId) return {
                    type: "text",
                    content: match[0],
                };

                return {
                    type: "osuTimestamp",
                    content: match[0],
                };
            },
            react: ({ content }) => <a href={`osu://edit/${content}`} onClick={
                e => {
                    e.preventDefault();
                    Native.openExternal(`osu://edit/${content}`);
                }
            }>{content}</a>
        };
    }
});
