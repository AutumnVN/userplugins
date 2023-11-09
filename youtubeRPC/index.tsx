/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";
const Native = VencordNative.pluginHelpers.YoutubeRPC as PluginNative<typeof import("./native")>;

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    url?: string;
    flags: number;
}

const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

async function createActivity(metadata: any) {
    if (!metadata) return;

    const activity: Activity = {
        application_id: '1',
        name: metadata.title,
        type: ActivityType.WATCHING,
        details: metadata.artist.replace(/ - Topic$/, ''),
        assets: {
            large_image: await getAsset(metadata.artwork),
        },
        buttons: ["Watch on YouTube"],
        metadata: {
            button_urls: [metadata.url]
        },
        timestamps: {
            start: Date.now() - metadata.currentTime * 1000,
            end: Date.now() + (metadata.duration - metadata.currentTime) * 1000
        },
        flags: 1 << 0
    };

    return activity;
}

function dispatchActivity(activity: Activity | null = null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: activity,
        socketId: "YoutubeRPC",
    });
}

let ws: WebSocket;
let interval: NodeJS.Timer;
let wsDebuggerUrl: string;

export default definePlugin({
    name: "YoutubeRPC",
    description: "Youtube RPC from Chrome Remote Debugger --remote-debugging-port=9222 --remote-allow-origins=https://discord.com",
    authors: [Devs.AutumnVN],

    async start() {
        await updatePresence();
        interval = setInterval(updatePresence, 3000);
    },
    stop() {
        clearInterval(interval);
        dispatchActivity(null);
        ws.close();
    },

});

async function updatePresence() {
    try {
        const webSocketDebuggerUrl = await Native.getWebSocketDebuggerUrl();
        if (!webSocketDebuggerUrl) return dispatchActivity(null);

        if (wsDebuggerUrl !== webSocketDebuggerUrl) {
            wsDebuggerUrl = webSocketDebuggerUrl;
            ws = new WebSocket(wsDebuggerUrl);
            ws.onopen = requestMetadata;
            ws.onmessage = async ({ data }) => {
                const response = JSON.parse(data);
                const metadata = response.result?.result?.value;
                if (response.id === 1) {
                    dispatchActivity(metadata?.playbackState === "playing" ? await createActivity(metadata) : null);
                }
            };
        } else {
            requestMetadata();
        }
    } catch (e) {
        dispatchActivity(null);
    }
}

function requestMetadata() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
            expression: `(() => {
                return {
                    "playbackState" : navigator.mediaSession.playbackState,
                    "title"         : navigator.mediaSession.metadata.title,
                    "artist"        : navigator.mediaSession.metadata.artist,
                    "album"         : navigator.mediaSession.metadata.album,
                    "artwork"       : navigator.mediaSession.metadata.artwork[0].src,
                    "currentTime"   : document.querySelector('video.video-stream').currentTime,
                    "duration"      : document.querySelector('video.video-stream').duration,
                    "url"           : window.location.href,
                }
            })();`,
            returnByValue: true
        }
    }));
}

async function getAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds('1', [key]))[0];
}
