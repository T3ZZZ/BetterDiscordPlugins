/**
 * @name BetterInbox
 * @author T3ZZZ
 * @description Replaces the Discord inbox with a list of the messages you never answered, so you can reply to them or dismiss them.
 * @version 1.0.0
 */

const { Data, DOM, UI, Webpack } = BdApi;

const NAME = "BetterInbox";
const MAX_ENTRIES = 50;
const PREVIEW_LENGTH = 140;
const DM_TYPE = 1;
const INBOX_SELECTOR = "[class*='trailing'] [class*='pulse'] [class*='clickable']";
const CLICKABLE_SELECTOR = "[role='button'], button";
const BUTTON_LABEL = "Better Inbox";
const HIDDEN_CLASS = "bi-hidden";
const MINUTE = 60000;
const AGE_UNITS = [[1440, "d"], [60, "h"], [1, "m"]];

const STYLES = `
.bi-hidden {
    display: none !important;
}

.bi-button {
    position: relative;
    color: var(--interactive-normal, #b5bac1);
    cursor: pointer;
}

.bi-button:hover {
    color: var(--interactive-hover, #dbdee1);
}

.bi-button.bi-open {
    color: var(--interactive-active, #f2f3f5);
}

.bi-badge {
    position: absolute;
    top: -3px;
    right: -4px;
    box-sizing: border-box;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--status-danger, #da373c);
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    line-height: 15px;
    text-align: center;
}

.bi-panel {
    position: fixed;
    z-index: 3000;
    width: 440px;
    max-width: 92vw;
    overflow: hidden;
    border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, .06));
    border-radius: 12px;
    background: var(--background-secondary, #2b2d31);
    box-shadow: 0 12px 32px rgba(0, 0, 0, .45);
    color: var(--text-normal, #dbdee1);
    font-family: var(--font-primary, sans-serif);
    animation: bi-appear .15s ease-out;
}

@keyframes bi-appear {
    from {
        opacity: 0;
        transform: translateY(-6px) scale(.98);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.bi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, .06));
}

.bi-title {
    color: var(--header-primary, #f2f3f5);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: .01em;
}

.bi-clear {
    padding: 4px 8px;
    border-radius: 6px;
    color: var(--text-muted, #949ba4);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;
}

.bi-clear:hover {
    background: var(--background-modifier-hover, rgba(255, 255, 255, .04));
    color: var(--text-normal, #dbdee1);
}

.bi-list {
    max-height: 460px;
    padding: 8px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--background-tertiary, #1e1f22) transparent;
}

.bi-list::-webkit-scrollbar {
    width: 8px;
}

.bi-list::-webkit-scrollbar-track {
    background: transparent;
}

.bi-list::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 8px;
    background-clip: content-box;
    background-color: var(--background-tertiary, #1e1f22);
}

.bi-entry {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-radius: 10px;
    transition: background .15s ease;
}

.bi-entry:hover {
    background: var(--background-modifier-hover, rgba(255, 255, 255, .04));
}

.bi-avatar {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 50%;
}

.bi-body {
    flex: 1;
    min-width: 0;
}

.bi-top {
    display: flex;
    align-items: center;
    gap: 6px;
}

.bi-author {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--header-primary, #f2f3f5);
    font-size: 15px;
    font-weight: 600;
}

.bi-pill {
    flex: 0 0 auto;
    padding: 1px 7px;
    border-radius: 8px;
    background: var(--background-modifier-selected, rgba(255, 255, 255, .08));
    color: var(--text-muted, #949ba4);
    font-size: 11px;
    font-weight: 600;
}

.bi-time {
    flex: 0 0 auto;
    margin-left: auto;
    color: var(--text-muted, #949ba4);
    font-size: 11px;
}

.bi-source {
    margin-top: 1px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--text-muted, #949ba4);
    font-size: 12px;
}

.bi-content {
    display: -webkit-box;
    margin-top: 6px;
    overflow: hidden;
    overflow-wrap: anywhere;
    color: var(--text-normal, #dbdee1);
    font-size: 13px;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.bi-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.bi-action {
    padding: 6px 14px;
    border: 0;
    border-radius: 8px;
    color: #ffffff;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background .15s ease;
}

.bi-reply {
    background: var(--brand-experiment, #5865f2);
}

.bi-reply:hover {
    background: var(--brand-experiment-560, #4752c4);
}

.bi-ignore {
    background: var(--button-danger-background, #da373c);
}

.bi-ignore:hover {
    background: var(--button-danger-background-hover, #a12828);
}

.bi-empty {
    padding: 40px 16px;
    text-align: center;
    color: var(--text-muted, #949ba4);
    font-size: 13px;
}
`;

module.exports = class BetterInbox {
    constructor() {
        this.entries = [];
        this.inbox = null;
        this.button = null;
        this.holder = null;
        this.badge = null;
        this.panel = null;
        this.list = null;
        this.observer = null;

        this.onMessage = this.onMessage.bind(this);
        this.onDocumentPointerDown = this.onDocumentPointerDown.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.inject = this.inject.bind(this);
    }

    start() {
        this.channelStore = Webpack.getStore("ChannelStore");
        this.guildStore = Webpack.getStore("GuildStore");
        this.userStore = Webpack.getStore("UserStore");
        this.messageStore = Webpack.getStore("MessageStore");
        this.dispatcher = this.getDispatcher();
        this.transitionTo = Webpack.getByStrings("transitionTo - Transitioning to", { searchExports: true });
        this.currentUserId = this.userStore?.getCurrentUser()?.id ?? null;
        this.entries = Data.load(NAME, "entries") ?? [];

        DOM.addStyle(NAME, STYLES);

        if (this.dispatcher) {
            this.dispatcher.subscribe("MESSAGE_CREATE", this.onMessage);
        } else {
            UI.showToast("Better Inbox could not hook incoming messages.", { type: "error" });
        }

        document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
        document.addEventListener("keydown", this.onKeyDown, true);

        this.observer = new MutationObserver(this.inject);
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.inject();
    }

    stop() {
        this.dispatcher?.unsubscribe("MESSAGE_CREATE", this.onMessage);
        document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
        document.removeEventListener("keydown", this.onKeyDown, true);

        this.observer?.disconnect();
        this.observer = null;

        this.closePanel();
        this.inbox?.classList.remove(HIDDEN_CLASS);
        this.inbox = null;
        this.button?.remove();
        this.button = null;
        this.holder = null;
        this.badge = null;

        DOM.removeStyle(NAME);
    }

    getDispatcher() {
        const candidate = Webpack.getByKeys("subscribe", "unsubscribe", "dispatch");

        if (typeof candidate?.subscribe === "function") {
            return candidate;
        }

        return Webpack.getModule(
            module => module?._actionHandlers && typeof module.subscribe === "function",
            { searchExports: true }
        );
    }

    findInbox() {
        const target = [...document.querySelectorAll(INBOX_SELECTOR)].find(
            element => !this.button?.contains(element)
        );

        if (!target) {
            return null;
        }

        return this.getWrapper(target.closest(CLICKABLE_SELECTOR) ?? target);
    }

    getWrapper(element) {
        let node = element;

        while (node.parentElement?.childElementCount === 1 && node.parentElement !== document.body) {
            node = node.parentElement;
        }

        return node;
    }

    inject() {
        if (!this.inbox?.isConnected) {
            this.inbox = this.findInbox();
        }

        if (!this.inbox) {
            return;
        }

        if (!this.button?.isConnected) {
            this.button = this.createButton(this.inbox);
            this.inbox.before(this.button);
            this.updateBadge();
        }

        this.inbox.classList.add(HIDDEN_CLASS);
    }

    createElement(tag, className, text = "") {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;

        return element;
    }

    createButton(inbox) {
        const button = inbox.cloneNode(true);
        button.classList.remove(HIDDEN_CLASS);

        const icon = button.querySelector("svg");
        const holder = icon?.parentElement ?? button;

        this.badge = this.createElement("span", "bi-badge");

        holder.classList.add("bi-button");
        this.holder = holder;

        if (icon) {
            holder.replaceChildren(icon, this.badge);
        } else {
            holder.append(this.badge);
        }

        button.setAttribute("aria-label", BUTTON_LABEL);
        button.querySelectorAll("[aria-label]").forEach(node => node.setAttribute("aria-label", BUTTON_LABEL));
        button.addEventListener("click", () => this.togglePanel());

        return button;
    }

    updateBadge() {
        if (!this.badge) {
            return;
        }

        this.badge.textContent = String(this.entries.length);
        this.badge.style.display = this.entries.length ? "block" : "none";
    }

    save() {
        Data.save(NAME, "entries", this.entries);
        this.updateBadge();

        if (this.panel) {
            this.renderList();
        }
    }

    onMessage({ message }) {
        this.currentUserId ??= this.userStore?.getCurrentUser()?.id ?? null;

        if (!message?.channel_id || !this.currentUserId) {
            return;
        }

        if (message.author?.id === this.currentUserId) {
            this.resolve(message.channel_id);
            return;
        }

        if (this.shouldTrack(message)) {
            this.track(message);
        }
    }

    shouldTrack(message) {
        if (message.author?.bot) {
            return false;
        }

        const channel = this.channelStore?.getChannel(message.channel_id);

        if (channel?.type === DM_TYPE) {
            return true;
        }

        return this.mentionsMe(message) || this.repliesToMe(message);
    }

    mentionsMe(message) {
        if (!Array.isArray(message.mentions)) {
            return false;
        }

        return message.mentions.some(mention => (mention?.id ?? mention) === this.currentUserId);
    }

    repliesToMe(message) {
        const reference = message.message_reference;

        if (!reference?.message_id) {
            return false;
        }

        const referenced = message.referenced_message ??
            this.messageStore?.getMessage?.(reference.channel_id ?? message.channel_id, reference.message_id);

        return referenced?.author?.id === this.currentUserId;
    }

    track(message) {
        const channel = this.channelStore?.getChannel(message.channel_id);
        const existing = this.entries.find(entry => entry.channelId === message.channel_id);

        const entry = {
            channelId: message.channel_id,
            guildId: channel?.guild_id ?? null,
            authorName: message.author?.global_name || message.author?.username || "Unknown",
            avatar: this.getAvatar(message.author),
            source: this.getSource(channel),
            content: this.getPreview(message),
            timestamp: Date.parse(message.timestamp) || Date.now(),
            count: (existing?.count ?? 0) + 1
        };

        this.entries = [entry, ...this.entries.filter(item => item.channelId !== entry.channelId)].slice(0, MAX_ENTRIES);

        this.save();
    }

    resolve(channelId) {
        const remaining = this.entries.filter(entry => entry.channelId !== channelId);

        if (remaining.length === this.entries.length) {
            return;
        }

        this.entries = remaining;
        this.save();
    }

    getAvatar(author) {
        if (author?.avatar) {
            return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=64`;
        }

        const index = Number((BigInt(author?.id ?? 0) >> 22n) % 6n);

        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    getSource(channel) {
        if (!channel || channel.type === DM_TYPE) {
            return "Direct message";
        }

        const guild = this.guildStore?.getGuild(channel.guild_id)?.name;
        const name = channel.name || "Group";

        if (guild) {
            return `${guild} • #${name}`;
        }

        return name;
    }

    getPreview(message) {
        const content = String(message.content ?? "").replace(/\s+/g, " ").trim();

        if (content) {
            return content.slice(0, PREVIEW_LENGTH);
        }

        if (message.attachments?.length) {
            return "Sent an attachment.";
        }

        return "Sent a message.";
    }

    togglePanel() {
        if (this.panel) {
            this.closePanel();
            return;
        }

        this.openPanel();
    }

    openPanel() {
        this.panel = this.createElement("div", "bi-panel");

        const header = this.createElement("div", "bi-header");
        const title = this.createElement("span", "bi-title", "Better Inbox");
        const clear = this.createElement("span", "bi-clear", "Ignore all");

        clear.addEventListener("click", () => {
            this.entries = [];
            this.save();
        });

        header.append(title, clear);

        this.list = this.createElement("div", "bi-list");

        this.panel.append(header, this.list);
        document.body.appendChild(this.panel);

        const rect = this.button.getBoundingClientRect();
        this.panel.style.top = `${rect.bottom + 8}px`;
        this.panel.style.right = `${Math.max(12, window.innerWidth - rect.right - 8)}px`;

        this.holder.classList.add("bi-open");
        this.renderList();
    }

    closePanel() {
        this.panel?.remove();
        this.panel = null;
        this.list = null;
        this.holder?.classList.remove("bi-open");
    }

    onDocumentPointerDown(event) {
        if (!this.panel || this.panel.contains(event.target) || this.button?.contains(event.target)) {
            return;
        }

        this.closePanel();
    }

    onKeyDown(event) {
        if (event.key === "Escape" && this.panel) {
            this.closePanel();
        }
    }

    renderList() {
        this.list.replaceChildren();

        if (!this.entries.length) {
            this.list.appendChild(this.createElement("div", "bi-empty", "Nothing waiting on you."));
            return;
        }

        this.entries.forEach(entry => this.list.appendChild(this.createEntry(entry)));
    }

    createEntry(entry) {
        const row = this.createElement("div", "bi-entry");
        const avatar = this.createElement("img", "bi-avatar");
        const body = this.createElement("div", "bi-body");
        const top = this.createElement("div", "bi-top");
        const author = this.createElement("span", "bi-author", entry.authorName);
        const time = this.createElement("span", "bi-time", this.formatAge(entry.timestamp));

        avatar.src = entry.avatar;
        top.append(author, time);

        if (entry.count > 1) {
            time.before(this.createElement("span", "bi-pill", `${entry.count} new`));
        }

        const source = this.createElement("div", "bi-source", entry.source);
        const content = this.createElement("div", "bi-content", entry.content);
        const actions = this.createElement("div", "bi-actions");
        const reply = this.createElement("button", "bi-action bi-reply", "Reply");
        const ignore = this.createElement("button", "bi-action bi-ignore", "Ignore");

        reply.addEventListener("click", () => this.openConversation(entry));
        ignore.addEventListener("click", () => {
            this.entries = this.entries.filter(item => item.channelId !== entry.channelId);
            this.save();
        });

        actions.append(reply, ignore);
        body.append(top, source, content, actions);
        row.append(avatar, body);

        return row;
    }

    formatAge(timestamp) {
        const minutes = Math.floor((Date.now() - timestamp) / MINUTE);

        if (minutes < 1) {
            return "just now";
        }

        const [size, unit] = AGE_UNITS.find(([value]) => minutes >= value);

        return `${Math.floor(minutes / size)}${unit} ago`;
    }

    openConversation(entry) {
        if (typeof this.transitionTo !== "function") {
            UI.showToast("Discord navigation not found.", { type: "error" });
            return;
        }

        this.closePanel();
        this.transitionTo(`/channels/${entry.guildId ?? "@me"}/${entry.channelId}`);
    }
};
