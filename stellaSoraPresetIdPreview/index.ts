/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { updateMessage } from "@api/MessageUpdater";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, Constants, RestAPI } from "@webpack/common";

const logger = new Logger("stellaSoraPresetIdPreview");

const convertEmbed = findByCodeLazy(".uniqueId(\"embed_\")");

function extractBuildIdFromUrl(url?: string) {
    if (!url) return "";
    const parts = url.split("https://stelladb.pages.dev/build/");
    return parts.length > 1 ? parts[1] : url;
}

async function unfurlEmbeds(urls: string[], message: Message) {
    if (!urls || urls.length === 0) return;

    const channel = ChannelStore.getChannel(message.channel_id);
    const convertedEmbeds: any[] = [];

    const chunkSize = 4;
    for (let i = 0; i < urls.length; i += chunkSize) {
        const batch = urls.slice(i, i + chunkSize);
        const resp = await RestAPI.post({
            url: Constants.Endpoints.UNFURL_EMBED_URLS,
            body: { urls: batch }
        }).catch(e => {
            logger.error("Failed to get embeds for batch", e);
            return null;
        });

        if (!resp?.body?.embeds || resp.body.embeds.length === 0) continue;

        for (const embed of resp.body.embeds) {
            try {
                const convertedEmbed = convertEmbed(channel?.id, message.id, embed);
                if (!convertedEmbed) {
                    logger.error("embed object couldn't be converted", embed);
                    continue;
                }
                convertedEmbeds.push(convertedEmbed);
            } catch (e) {
                logger.error("Failed to convert embed", e);
            }
        }
    }

    const existingEmbeds = message.embeds || [];
    const map = new Map<string, any>();

    for (const e of existingEmbeds) {
        const id = extractBuildIdFromUrl(e?.url);
        if (id) map.set(id, e);
    }

    for (const e of convertedEmbeds) {
        const id = extractBuildIdFromUrl(e?.url);
        if (!id) continue;
        if (!map.has(id)) map.set(id, e);
    }

    const newEmbeds = Array.from(map.values());

    newEmbeds.sort((a: any, b: any) => {
        return message.content.indexOf(extractBuildIdFromUrl(a.url)) - message.content.indexOf(extractBuildIdFromUrl(b.url));
    });

    updateMessage(message.channel_id, message.id, { embeds: newEmbeds });
}

export default definePlugin({
    name: "stellaSoraPresetIdPreview",
    description: "Add embed preview for stella sora preset ids",
    authors: [Devs.AutumnVN],

    patches: [
        {
            find: "Message must not be a thread starter message",
            replacement: {
                match: /renderContentOnly:\i}=\i;/,
                replace: "$&$self.addEmbeds(arguments[0].message);"
            }
        },
    ],

    addEmbeds(message: Message) {
        if (!message.content) return;

        const presetIdRegex = /\b(AAAA[A-Za-z0-9+/=]{20,50})/g;
        const matches = message.content.match(presetIdRegex) || [];
        const ids = Array.from(new Set(matches));

        if (ids.length === 0) return;

        const existingIds = new Set(
            (message.embeds || [])
                .map((e: any) => extractBuildIdFromUrl(e?.url))
                .filter(Boolean)
        );

        const idsToFetch = ids.filter(id => !existingIds.has(id));
        if (idsToFetch.length === 0) return;

        const urlsToFetch = idsToFetch.map(id => `https://stelladb.pages.dev/build/${id}`);

        unfurlEmbeds(urlsToFetch, message);
    }
});
