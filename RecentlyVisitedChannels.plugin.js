/**
 * @name RecentlyVisitedChannels
 * @author T3ZZZ
 * @description Quickly access recently visited Discord channels and DMs.
 * @version 1.0.0
 */

const { Data, DOM, UI, Webpack } = BdApi;

const NAME = "RecentlyVisitedChannels";
const MAX_ITEMS = 20;
const DM_TYPES = [1, 3];
const DEFAULT_SETTINGS = { key: "h", ctrl: true, shift: true, alt: false };
const AGE_UNITS = [[86400, "d"], [3600, "h"], [60, "m"], [1, "s"]];

const STYLES = `
.rvc-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 15vh;
    background: rgba(0, 0, 0, .55);
}

.rvc-modal {
    width: 560px;
    max-width: 90vw;
    overflow: hidden;
    border-radius: 12px;
    background: var(--background-secondary, #1e1f22);
    box-shadow: 0 15px 50px rgba(0, 0, 0, .6);
    color: var(--text-normal, #f2f3f5);
    font-family: var(--font-primary, sans-serif);
}

.rvc-search {
    width: 100%;
    box-sizing: border-box;
    padding: 14px;
    border: 0;
    outline: 0;
    background: var(--background-tertiary, #111214);
    color: var(--text-normal, #ffffff);
    font-size: 16px;
}

.rvc-list {
    max-height: 420px;
    padding: 8px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--background-tertiary, #2b2d31) transparent;
}

.rvc-list::-webkit-scrollbar {
    width: 8px;
}

.rvc-list::-webkit-scrollbar-track {
    margin: 4px 0;
    border-radius: 4px;
    background: transparent;
}

.rvc-list::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: var(--background-tertiary, #2b2d31);
}

.rvc-list::-webkit-scrollbar-thumb:hover {
    background-color: var(--background-modifier-selected, #404249);
}

.rvc-item {
    display: flex;
    align-items: center;
    padding: 11px 12px;
    margin-bottom: 2px;
    border-radius: 7px;
    cursor: pointer;
    user-select: none;
}

.rvc-item.rvc-selected {
    background: var(--background-modifier-selected, #404249);
}

.rvc-icon {
    width: 32px;
    font-size: 18px;
    pointer-events: none;
}

.rvc-content {
    flex: 1;
    min-width: 0;
    pointer-events: none;
}

.rvc-name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 15px;
    font-weight: 600;
}

.rvc-meta {
    margin-top: 2px;
    color: var(--text-muted, #949ba4);
    font-size: 12px;
}

.rvc-empty {
    padding: 24px;
    text-align: center;
    color: var(--text-muted, #949ba4);
}
`;

module.exports = class RecentlyVisitedChannels {
    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.history = [];
        this.selected = 0;
        this.overlay = null;
        this.search = null;
        this.list = null;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onOverlayPointerDown = this.onOverlayPointerDown.bind(this);
        this.onChannelChange = this.onChannelChange.bind(this);
    }

    start() {
        this.settings = { ...DEFAULT_SETTINGS, ...(Data.load(NAME, "settings") ?? {}) };

        this.channelStore = Webpack.getStore("ChannelStore");
        this.guildStore = Webpack.getStore("GuildStore");
        this.userStore = Webpack.getStore("UserStore");
        this.selectedChannelStore = Webpack.getStore("SelectedChannelStore");
        this.transitionTo = Webpack.getByStrings("transitionTo - Transitioning to", { searchExports: true });

        DOM.addStyle(NAME, STYLES);
        document.addEventListener("keydown", this.onKeyDown, true);
        this.selectedChannelStore?.addChangeListener(this.onChannelChange);

        this.onChannelChange();
    }

    stop() {
        document.removeEventListener("keydown", this.onKeyDown, true);
        this.selectedChannelStore?.removeChangeListener(this.onChannelChange);
        this.close();
        this.history = [];

        DOM.removeStyle(NAME);
    }

    getSettingsPanel() {
        return UI.buildSettingsPanel({
            settings: [
                { type: "switch", id: "ctrl", name: "Ctrl", value: this.settings.ctrl },
                { type: "switch", id: "shift", name: "Shift", value: this.settings.shift },
                { type: "switch", id: "alt", name: "Alt", value: this.settings.alt },
                {
                    type: "text",
                    id: "key",
                    name: "Key",
                    note: "Single letter or digit used together with the modifiers above.",
                    value: this.settings.key.toUpperCase()
                }
            ],
            onChange: (_, id, value) => {
                this.updateSetting(id, value);
            }
        });
    }

    updateSetting(id, value) {
        if (id === "key") {
            const key = String(value).replace(/[^a-z0-9]/gi, "").slice(-1).toLowerCase();

            if (!key) {
                return;
            }

            this.settings.key = key;
        } else {
            this.settings[id] = value;
        }

        Data.save(NAME, "settings", this.settings);
    }

    onChannelChange() {
        const id = this.selectedChannelStore?.getChannelId();

        if (!id) {
            return;
        }

        const channel = this.channelStore?.getChannel(id);

        if (!channel) {
            return;
        }

        const entry = {
            id,
            type: channel.type,
            name: this.getChannelName(channel),
            server: this.guildStore?.getGuild(channel.guild_id)?.name ?? "",
            timestamp: Date.now()
        };

        this.history = [entry, ...this.history.filter(item => item.id !== id)].slice(0, MAX_ITEMS);
    }

    getChannelName(channel) {
        if (!DM_TYPES.includes(channel.type)) {
            return channel.name || "Unknown";
        }

        const user = this.userStore?.getUser(channel.recipients?.[0]);

        return user?.globalName || user?.username || channel.name || "Unknown";
    }

    onKeyDown(event) {
        if (this.isShortcut(event)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.toggle();
            return;
        }

        if (!this.overlay) {
            return;
        }

        switch (event.key) {
            case "Escape":
                event.preventDefault();
                this.close();
                break;
            case "ArrowDown":
                event.preventDefault();
                this.move(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                this.move(-1);
                break;
            case "Enter":
                event.preventDefault();
                this.openSelected();
                break;
        }
    }

    isShortcut(event) {
        return event.key.toLowerCase() === this.settings.key &&
            event.ctrlKey === this.settings.ctrl &&
            event.shiftKey === this.settings.shift &&
            event.altKey === this.settings.alt;
    }

    toggle() {
        if (this.overlay) {
            this.close();
            return;
        }

        this.open();
    }

    open() {
        this.selected = 0;

        this.search = this.createElement("input", "rvc-search");
        this.search.type = "text";
        this.search.placeholder = "Search recently visited...";
        this.search.autocomplete = "off";
        this.search.addEventListener("input", () => {
            this.selected = 0;
            this.render();
        });

        this.list = this.createElement("div", "rvc-list");

        const modal = this.createElement("div", "rvc-modal");
        modal.append(this.search, this.list);

        this.overlay = this.createElement("div", "rvc-overlay");
        this.overlay.appendChild(modal);
        this.overlay.addEventListener("pointerdown", this.onOverlayPointerDown);

        document.body.appendChild(this.overlay);
        this.render();
        this.search.focus();
    }

    close() {
        this.overlay?.remove();
        this.overlay = null;
        this.search = null;
        this.list = null;
    }

    onOverlayPointerDown(event) {
        if (event.target === this.overlay) {
            this.close();
        }
    }

    getFiltered() {
        const query = this.search?.value.trim().toLowerCase() ?? "";

        if (!query) {
            return this.history;
        }

        return this.history.filter(item => `${item.name} ${item.server}`.toLowerCase().includes(query));
    }

    render() {
        const items = this.getFiltered();

        this.list.replaceChildren();

        if (!items.length) {
            this.list.appendChild(this.createElement("div", "rvc-empty", "No recently visited channels."));
            return;
        }

        items.forEach((item, index) => {
            this.list.appendChild(this.createRow(item, index));
        });
    }

    createRow(item, index) {
        const row = this.createElement("div", "rvc-item");
        row.classList.toggle("rvc-selected", index === this.selected);

        const icon = this.createElement("span", "rvc-icon", DM_TYPES.includes(item.type) ? "💬" : "#");
        const content = this.createElement("div", "rvc-content");
        const name = this.createElement("div", "rvc-name", item.name);
        const meta = this.createElement(
            "div",
            "rvc-meta",
            [item.server, this.formatAge(item.timestamp)].filter(Boolean).join(" • ")
        );

        content.append(name, meta);
        row.append(icon, content);

        row.addEventListener("mouseenter", () => {
            this.selected = index;
            this.updateSelection();
        });

        row.addEventListener("pointerdown", event => {
            if (event.button !== 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            this.openChannel(item.id);
        });

        return row;
    }

    createElement(tag, className, text = "") {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;

        return element;
    }

    updateSelection() {
        [...this.list.children].forEach((row, index) => {
            row.classList.toggle("rvc-selected", index === this.selected);
        });
    }

    move(amount) {
        const items = this.getFiltered();

        if (!items.length) {
            return;
        }

        this.selected = (this.selected + amount + items.length) % items.length;
        this.updateSelection();
        this.list.children[this.selected]?.scrollIntoView({ block: "nearest" });
    }

    openSelected() {
        const item = this.getFiltered()[this.selected];

        if (!item) {
            return;
        }

        this.openChannel(item.id);
    }

    openChannel(id) {
        const channel = this.channelStore?.getChannel(id);

        if (!channel) {
            return;
        }

        if (typeof this.transitionTo !== "function") {
            UI.showToast("Discord navigation not found.", { type: "error" });
            return;
        }

        this.close();
        this.transitionTo(`/channels/${channel.guild_id ?? "@me"}/${id}`);
    }

    formatAge(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 10) {
            return "just now";
        }

        const [size, unit] = AGE_UNITS.find(([value]) => seconds >= value);

        return `${Math.floor(seconds / size)}${unit} ago`;
    }
};
