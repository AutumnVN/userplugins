/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PlusIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { type Message } from "@vencord/discord-types";
import { ChannelStore, Toasts, UserStore } from "@webpack/common";

export default definePlugin({
    name: "counter",
    description: "message button to send a incremented number of the message in counter channel",
    authors: [Devs.AutumnVN],
    dependencies: ["MessagePopoverAPI"],

    messagePopoverButton: {
        icon: PlusIcon,
        render(message: Message) {
            const currentUser = UserStore.getCurrentUser();
            if (!message || !message.author || message.author.id === currentUser?.id) return null;

            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel || !channel.name || !channel.name.toLowerCase().includes("count")) return null;

            if (!parseInt(message.content)) return null;

            return {
                label: "+1",
                icon: PlusIcon,
                message,
                channel,
                onClick: () => {
                    const content = String(parseInt(message.content) + 1);

                    sendMessage(channel.id, { content }, true).catch(() => {
                        Toasts.show({
                            message: "Failed to send message",
                            type: Toasts.Type.FAILURE,
                            id: Toasts.genId()
                        });
                    });
                }
            };
        }
    }
});
