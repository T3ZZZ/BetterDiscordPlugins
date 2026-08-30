/**
 * @name UnansweredTimer
 * @author T3ZZZ
 * @description Displays how long a message has been waiting for your reply and how long the author took to write it.
 * @version 1.0.0
 */

const { DOM, Webpack } = BdApi;

const NAME = "UnansweredTimer";
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const REFRESH_INTERVAL = 3 * SECOND;
const TYPING_GRACE = 15 * SECOND;
const MAX_MESSAGE_AGE = 24 * HOUR;
const MAX_WRITING_TIME = 30 * MINUTE;
const WARNING_AFTER = 30 * MINUTE;
const URGENT_AFTER = 2 * HOUR;
const MAX_FIBER_DEPTH = 50;
const DM_TYPE = 1;

const MESSAGE_SELECTOR = "[id^='chat-messages-']";
const CONTENT_SELECTOR = "[class*='messageContent'], [class*='contents'], [class*='markup']";
const CHAT_SELECTOR = "[data-list-id='chat-messages'], [class*='messagesWrapper'], [class*='chatContent']";

const STYLES = `
.unanswered-timer {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    color: var(--text-muted, #72767d);
    font-size: 11px;
    user-select: none;
    animation: unanswered-timer-fade-in .3s ease;
}

.unanswered-timer.unanswered-timer-warning {
    color: var(--text-warning, #faa61a);
}

.unanswered-timer.unanswered-timer-urgent {
    color: var(--text-danger, #ed4245);
    font-weight: 500;
}

@keyframes unanswered-timer-fade-in {
    from {
        opacity: 0;
        transform: translateY(-2px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

module.exports = class UnansweredTimer {
    constructor() {
        this.typingSessions = new Map();
        this.writingTimes = new Map();
        this.seenMessages = new Set();
        this.messageCache = new WeakMap();
        this.chat = null;
        this.chatObserver = null;
        this.refreshInterval = null;
        this.typingInterval = null;
        this.refreshTimeout = null;

        this.refresh = this.refresh.bind(this);
        this.trackTyping = this.trackTyping.bind(this);
        this.onChannelChange = this.onChannelChange.bind(this);
    }

    start() {
        this.userStore = Webpack.getStore("UserStore");
        this.channelStore = Webpack.getStore("ChannelStore");
        this.messageStore = Webpack.getStore("MessageStore");
        this.referencedMessageStore = Webpack.getStore("ReferencedMessageStore");
        this.selectedChannelStore = Webpack.getStore("SelectedChannelStore");
        this.typingStore = Webpack.getStore("TypingStore") ?? Webpack.getModule(module => typeof module?.getTypingUsers === "function");
        this.currentUserId = this.userStore?.getCurrentUser()?.id ?? null;

        DOM.addStyle(NAME, STYLES);

        this.selectedChannelStore?.addChangeListener(this.onChannelChange);

        this.typingInterval = setInterval(this.trackTyping, 500);
        this.refreshInterval = setInterval(this.refresh, REFRESH_INTERVAL);
        this.scheduleRefresh();
    }

    stop() {
        clearInterval(this.refreshInterval);
        clearInterval(this.typingInterval);
        clearTimeout(this.refreshTimeout);

        this.selectedChannelStore?.removeChangeListener(this.onChannelChange);

        this.chatObserver?.disconnect();
        this.chatObserver = null;
        this.chat = null;

        this.typingSessions.clear();
        this.writingTimes.clear();
        this.seenMessages.clear();
        this.messageCache = new WeakMap();

        document.querySelectorAll(".unanswered-timer").forEach(timer => timer.remove());
        DOM.removeStyle(NAME);
    }

    scheduleRefresh(delay = 250) {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(this.refresh, delay);
    }

    onChannelChange() {
        this.chat = null;
        this.chatObserver?.disconnect();
        this.scheduleRefresh();
    }

    getCurrentChannelId() {
        return this.selectedChannelStore?.getChannelId();
    }

    trackTyping() {
        const channelId = this.getCurrentChannelId();

        if (!this.typingStore || !channelId) {
            return;
        }

        const typing = this.typingStore.getTypingUsers(channelId);

        if (!typing) {
            return;
        }

        const now = Date.now();

        for (const userId of Object.keys(typing)) {
            if (userId === this.currentUserId) {
                continue;
            }

            const session = this.typingSessions.get(`${channelId}:${userId}`);

            if (session) {
                session.lastActive = now;
                continue;
            }

            this.typingSessions.set(`${channelId}:${userId}`, { started: now, lastActive: now });
        }
    }

    pruneTypingSessions() {
        const now = Date.now();

        for (const [key, session] of this.typingSessions) {
            if (now - session.lastActive > TYPING_GRACE || now - session.started > MAX_WRITING_TIME) {
                this.typingSessions.delete(key);
            }
        }
    }

    detectNewMessages(entries) {
        const channelId = this.getCurrentChannelId();

        if (!channelId) {
            return;
        }

        for (const { data } of entries) {
            if (!data?.id || !data.authorId || this.seenMessages.has(data.id)) {
                continue;
            }

            this.seenMessages.add(data.id);

            if (data.authorId !== this.currentUserId) {
                this.saveWritingTime(channelId, data);
            }
        }

        if (this.seenMessages.size > 2000) {
            this.seenMessages = new Set([...this.seenMessages].slice(-1000));
        }
    }

    saveWritingTime(channelId, data) {
        const key = `${channelId}:${data.authorId}`;
        const session = this.typingSessions.get(key);

        this.typingSessions.delete(key);

        if (!session) {
            return;
        }

        const duration = Date.now() - session.started;

        if (duration < 0 || duration > MAX_WRITING_TIME) {
            return;
        }

        this.writingTimes.set(data.id, duration);

        if (this.writingTimes.size > 200) {
            this.writingTimes.delete(this.writingTimes.keys().next().value);
        }
    }

    observeChat() {
        const chat = document.querySelector(CHAT_SELECTOR);

        if (!chat || chat === this.chat) {
            return;
        }

        this.chat = chat;
        this.chatObserver?.disconnect();
        this.chatObserver = new MutationObserver(() => this.scheduleRefresh());
        this.chatObserver.observe(chat, { childList: true, subtree: true });
    }

    getMessages() {
        return [...(this.chat ?? document).querySelectorAll(MESSAGE_SELECTOR)];
    }

    findMessage(element) {
        const key = Object.keys(element).find(name => name.startsWith("__reactFiber"));

        if (!key) {
            return null;
        }

        let fiber = element[key];

        for (let depth = 0; fiber && depth < MAX_FIBER_DEPTH; depth++) {
            const message = fiber.memoizedProps?.message;

            if (message?.id) {
                return message;
            }

            fiber = fiber.return;
        }

        return null;
    }

    readMessage(element) {
        const cached = this.messageCache.get(element);

        if (cached?.domId === element.id) {
            return cached.data;
        }

        const message = this.findMessage(element);

        const data = message && {
            id: message.id,
            authorId: message.author?.id ?? null,
            timestamp: Date.parse(message.timestamp),
            mentionsMe: this.isMentioningMe(message),
            reference: message.messageReference ?? message.message_reference ?? null
        };

        this.messageCache.set(element, { domId: element.id, data });

        return data;
    }

    isMentioningMe(message) {
        if (!Array.isArray(message.mentions)) {
            return false;
        }

        return message.mentions.some(mention => (mention?.id ?? mention) === this.currentUserId);
    }

    isReplyToMe(reference) {
        if (!reference?.message_id) {
            return false;
        }

        const referenced = this.referencedMessageStore?.getMessageByReference?.(reference)?.message ??
            this.messageStore?.getMessage?.(reference.channel_id, reference.message_id);

        return referenced?.author?.id === this.currentUserId;
    }

    isPrivateConversation() {
        const channel = this.channelStore?.getChannel(this.getCurrentChannelId());

        return channel?.type === DM_TYPE;
    }

    refresh() {
        this.currentUserId ??= this.userStore?.getCurrentUser()?.id ?? null;

        if (!this.currentUserId) {
            return;
        }

        this.observeChat();

        const entries = this.getMessages().map(element => ({
            element,
            data: this.readMessage(element)
        }));

        this.detectNewMessages(entries);
        this.pruneTypingSessions();

        const lastOwnIndex = entries.findLastIndex(
            entry => entry.data?.authorId === this.currentUserId
        );

        const privateConversation = this.isPrivateConversation();

        entries.forEach((entry, index) => {
            if (this.shouldShowTimer(entry.data, index, lastOwnIndex, privateConversation)) {
                this.showTimer(entry.element, entry.data);
                return;
            }

            entry.element.querySelector(".unanswered-timer")?.remove();
        });
    }

    shouldShowTimer(data, index, lastOwnIndex, privateConversation) {
        if (!data?.authorId || data.authorId === this.currentUserId || !data.timestamp) {
            return false;
        }

        if (index < lastOwnIndex) {
            return false;
        }

        if (Date.now() - data.timestamp > MAX_MESSAGE_AGE) {
            return false;
        }

        if (privateConversation) {
            return true;
        }

        return data.mentionsMe || this.isReplyToMe(data.reference);
    }

    showTimer(element, data) {
        let timer = element.querySelector(".unanswered-timer");

        if (!timer) {
            timer = document.createElement("div");
            timer.className = "unanswered-timer";
            (element.querySelector(CONTENT_SELECTOR) ?? element).appendChild(timer);
        }

        const elapsed = Date.now() - data.timestamp;
        const writingTime = this.writingTimes.get(data.id);
        const parts = [`Waiting for a reply for ${this.formatDuration(elapsed)}`];

        if (writingTime !== undefined) {
            parts.push(`took ${this.formatDuration(writingTime)} to write`);
        }

        timer.textContent = `${parts.join(", ")}.`;
        timer.classList.toggle("unanswered-timer-warning", elapsed > WARNING_AFTER && elapsed <= URGENT_AFTER);
        timer.classList.toggle("unanswered-timer-urgent", elapsed > URGENT_AFTER);
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / SECOND);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days) {
            return `${days}d`;
        }

        if (hours) {
            return this.joinUnits(`${hours}h`, minutes % 60, "m");
        }

        if (minutes) {
            return this.joinUnits(`${minutes}m`, seconds % 60, "s");
        }

        if (seconds) {
            return `${seconds}s`;
        }

        return "a few seconds";
    }

    joinUnits(main, remainder, unit) {
        if (!remainder) {
            return main;
        }

        return `${main} ${remainder}${unit}`;
    }
};