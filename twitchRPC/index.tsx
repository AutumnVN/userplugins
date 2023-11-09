/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";
const Native = VencordNative.pluginHelpers.TwitchRPC as PluginNative<typeof import("./native")>;

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
        application_id: '2',
        name: `${metadata.streamer} | ${metadata.game}`,
        type: ActivityType.WATCHING,
        details: metadata.title,
        assets: {
            large_image: await getAsset(metadata.thumbnail || metadata.avatar),
        },
        buttons: ["Watch on Twitch"],
        metadata: {
            button_urls: [metadata.url]
        },
        timestamps: {
            start: Date.now() - metadata.currentTime * 1000,
            end: metadata.duration ? Date.now() + (metadata.duration - metadata.currentTime) * 1000 : undefined
        },
        flags: 1 << 0
    };

    return activity;
}

function dispatchActivity(activity: Activity | null = null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: activity,
        socketId: "TwitchRPC",
    });
}

let ws: WebSocket;
let interval: NodeJS.Timer;
let wsDebuggerUrl: string;

export default definePlugin({
    name: "TwitchRPC",
    description: "Twitch RPC from Chrome Remote Debugger --remote-debugging-port=9222 --remote-allow-origins=https://discord.com",
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
                    dispatchActivity(metadata?.isPlaying ? await createActivity(metadata) : null);
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
                    "streamer"      : document.querySelector('h1.tw-title').textContent,
                    "avatar"        : document.querySelector('img.tw-image-avatar[alt="' + document.querySelector('h1.tw-title').textContent + '"]').src,
                    "title"         : document.querySelector('h2[data-a-target="stream-title"]')?.textContent,
                    "game"          : document.querySelector('a[data-a-target="stream-game-link"]')?.textContent || document.querySelector('#live-channel-stream-information a.tw-link').textContent,
                    "thumbnail"     : document.querySelector('video[playsinline]').src === window.location.href ? undefined : document.querySelector('video[playsinline]').src.includes('production.assets.clips.twitchcdn.net/v2/media') ? document.querySelector('video[playsinline]').src.replace('production.assets.clips.twitchcdn.net/v2/media', 'static-cdn.jtvnw.net/twitch-clips-thumbnails-prod').split('?')[0].replace('video.mp4', 'preview.jpg') : document.querySelector('video[playsinline]').src.replace('production.assets.clips.twitchcdn.net', 'clips-media-assets2.twitch.tv').split('?')[0].replace('.mp4', '-preview.jpg'),
                    "isPlaying"     : !document.querySelector('video[playsinline]').paused && !document.querySelector('video[playsinline]').ended,
                    "currentTime"   : document.querySelector('video[playsinline]').currentTime,
                    "duration"      : document.querySelector('video[playsinline]').duration !== 1073741824 ? document.querySelector('video[playsinline]').duration : undefined,
                    "url"           : window.location.href,
                }
            })();`,
            returnByValue: true
        }
    }));
}

async function getAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds('2', [key]))[0];
}
