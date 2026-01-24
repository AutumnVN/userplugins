/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    targetLanguage: {
        type: OptionType.STRING,
        description: "The language messages should be translated to",
        default: "en"
    },
    shouldTranslateLanguage: {
        type: OptionType.STRING,
        description: "The language messages should be translated",
        default: "ja,zh-CN,zh-TW,ko",
    }
});

async function translateAPI(sourceLang: string, targetLang: string, text: string): Promise<any> {

    const url = "https://translate-pa.googleapis.com/v1/translate?" + new URLSearchParams({
        "params.client": "gtx",
        "dataTypes": "TRANSLATION",
        "key": "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA",
        "query.sourceLanguage": sourceLang,
        "query.targetLanguage": targetLang,
        "query.text": text,
    });
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to translate "${text}" from ${sourceLang} to ${targetLang}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function translate(message) {
    if (message.translated || !message.content || (message.content.startsWith("<") && message.content.endsWith(">"))) return;

    message.translated = true;
    const res = await translateAPI("auto", settings.store.targetLanguage, message.content);

    if (res.sourceLanguage === settings.store.targetLanguage || !settings.store.shouldTranslateLanguage.includes(res.sourceLanguage)) return;

    const translatedText = res.translation.replace(/````+/g, "```");
    if (translatedText.replace(/\s+/g, "").includes(message.content.replace(/\s+/g, ""))) return;
    const multiline = translatedText.includes("\n") ? "\n```" : "\n-# ";
    const sourceLang = ` - ${res.sourceLanguage}`;
    const endBacktick = translatedText.includes("\n") ? "```" : "";
    message.content = `${translatedText}${multiline}${message.content.replace(/`{3,9}/g, "\u200b`\u200b`\u200b`\u200b")}${endBacktick}${sourceLang}`;
}

export default definePlugin({
    name: "AutoTranslate",
    description: "Auto translate messages to your language",
    authors: [Devs.AutumnVN],
    settings,
    translate,
    patches: [
        {
            find: "Message must not be a thread starter message",
            replacement: {
                match: /renderContentOnly:\i}=\i;/,
                replace: "$&$self.translate(arguments[0].message);"
            }
        },
    ]
});
