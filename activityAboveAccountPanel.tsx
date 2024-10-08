import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { PresenceStore, UserStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

interface Activity {
    created_at: number;
    id: string;
    name: string;
    type: number;
    emoji?: {
        animated: boolean;
        id: string;
        name: string;
    };
    state?: string;
    flags?: number;
    sync_id?: string;
    details?: string;
    application_id?: string;
    assets?: {
        large_text?: string;
        large_image?: string;
        small_text?: string;
        small_image?: string;
    };
    timestamps?: Timestamp;
    platform?: string;
}

interface Timestamp {
    start?: number;
    end?: number;
}
const ActivityView = findComponentByCodeLazy<{
    activity: Activity | null;
    user: User;
    currentUser: User;
}>('location:"UserProfileActivityCard",');

const settings = definePluginSettings({
    showButtons: {
        type: OptionType.BOOLEAN,
        description: "Show buttons",
        default: false
    }
});


export default definePlugin({
    name: "ActivityAboveAccountPanel",
    description: "Shows your activities above the account panel",
    authors: [Devs.AutumnVN],
    settings,
    patches: [
        {
            find: "this.isCopiedStreakGodlike",
            replacement: {
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,hidePrivateData:)/,
                replace: "$self.PanelWrapper,{VencordOriginal:$1,"
            }
        }
    ],

    PanelWrapper({ VencordOriginal, ...props }) {
        const currentUser = UserStore.getCurrentUser();

        if (!currentUser) return null;

        const activities = useStateFromStores<Activity[]>(
            [PresenceStore], () => PresenceStore.getActivities(currentUser.id).filter((activity: Activity) => activity.type !== 4)
        ) ?? [];

        return (
            <>
                <ErrorBoundary>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px"
                        }}
                    >
                        {activities.map((activity, index) =>
                        (
                            <ActivityView
                                key={index}
                                activity={activity}
                                user={currentUser}
                                currentUser={settings.store.showButtons ? UserStore.getUser('643945264868098049') : currentUser}
                            />)
                        )}
                    </div>
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    }
});
