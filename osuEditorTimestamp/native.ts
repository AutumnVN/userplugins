/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent, shell } from "electron";

export function openExternal(_: IpcMainInvokeEvent, url: string) {
    shell.openExternal(url);
}
