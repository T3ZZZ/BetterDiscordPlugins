/**
 * @name MessagePurger
 * @author T3ZZZ
 * @description Delete your own messages in the current channel with a chosen amount and delay.
 * @version 1.0.0
 */

const { DOM, Webpack } = BdApi;

const NAME = "MessagePurger";
const BUTTON_CLASS = "mp-button";
const TOOLBAR_SELECTOR = '[class*="title_"] [class*="toolbar_"]';
const SEARCH_PAGE_SIZE = 25;
const SEARCH_INTERVAL = 1500;
const SEARCH_RETRIES = 5;
const HISTORY_PAGE_SIZE = 100;
const HISTORY_PAGES = 20;
const API_METHODS = ["get", "post", "put", "patch", "del"];
const AMOUNT_PRESETS = [25, 50, 100, 250];
const STORE_DELAY = 400;
const DELETABLE_TYPES = [0, 19];
const INDEXING_CODE = 110000;

const TRASH_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z"></path><path d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07Z"></path></svg>`;

const STYLES = `
.mp-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    box-sizing: border-box;
    margin: 0 8px;
    color: var(--mp-color, var(--interactive-normal, #b5bac1));
    cursor: pointer;
    transition: color .15s ease;
}

.mp-button:hover {
    color: var(--interactive-hover, #dbdee1);
}

.mp-button.mp-active {
    color: var(--status-danger, #da373c);
}

.mp-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, .6);
    animation: mp-fade .15s ease-out;
}

@keyframes mp-fade {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.mp-modal {
    width: 440px;
    max-width: 92vw;
    overflow: hidden;
    border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, .06));
    border-radius: 12px;
    background: var(--background-secondary, #2b2d31);
    box-shadow: 0 12px 32px rgba(0, 0, 0, .45);
    color: var(--text-normal, #dbdee1);
    font-family: var(--font-primary, sans-serif);
    animation: mp-appear .15s ease-out;
}

@keyframes mp-appear {
    from {
        opacity: 0;
        transform: translateY(-6px) scale(.98);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes mp-pulse {
    0%, 100% {
        opacity: 1;
    }

    50% {
        opacity: .25;
    }
}

.mp-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, .06));
}

.mp-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(218, 55, 60, .12);
    color: var(--status-danger, #da373c);
}

.mp-heading {
    min-width: 0;
}

.mp-title {
    color: var(--header-primary, #f2f3f5);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: .01em;
}

.mp-target {
    margin-top: 2px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--text-muted, #949ba4);
    font-size: 12px;
}

.mp-body {
    padding: 16px;
}

.mp-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.mp-label {
    display: block;
    margin-bottom: 6px;
    color: var(--text-muted, #949ba4);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
}

.mp-input {
    box-sizing: border-box;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, .06));
    border-radius: 8px;
    outline: none;
    background: var(--background-tertiary, #1e1f22);
    color: var(--text-normal, #dbdee1);
    font-family: inherit;
    font-size: 15px;
    font-variant-numeric: tabular-nums;
    transition: border-color .15s ease, box-shadow .15s ease;
}

.mp-input:focus {
    border-color: var(--brand-experiment, #5865f2);
    box-shadow: 0 0 0 3px rgba(88, 101, 242, .18);
}

.mp-input:disabled {
    opacity: .5;
    cursor: not-allowed;
}

.mp-input::-webkit-inner-spin-button {
    opacity: .35;
}

.mp-chips {
    display: flex;
    gap: 6px;
    margin-top: 12px;
}

.mp-chip {
    padding: 5px 12px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--background-modifier-selected, rgba(255, 255, 255, .06));
    color: var(--text-muted, #949ba4);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s ease, color .15s ease, border-color .15s ease;
}

.mp-chip:hover {
    background: var(--background-modifier-hover, rgba(255, 255, 255, .1));
    color: var(--text-normal, #dbdee1);
}

.mp-chip.mp-selected {
    border-color: var(--brand-experiment, #5865f2);
    color: var(--header-primary, #f2f3f5);
}

.mp-estimate {
    margin-top: 14px;
    color: var(--text-muted, #949ba4);
    font-size: 12px;
    line-height: 1.4;
}

.mp-progress {
    height: 4px;
    margin: 0 16px;
    overflow: hidden;
    border-radius: 4px;
    background: var(--background-modifier-selected, rgba(255, 255, 255, .06));
    opacity: 0;
    transition: opacity .2s ease;
}

.mp-busy .mp-progress {
    opacity: 1;
}

.mp-fill {
    width: 0;
    height: 100%;
    border-radius: 4px;
    background: var(--status-danger, #da373c);
    transition: width .25s ease;
}

.mp-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px 0;
    color: var(--text-muted, #949ba4);
    font-size: 12px;
}

.mp-dot {
    flex: 0 0 auto;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted, #949ba4);
}

.mp-busy .mp-dot {
    background: var(--status-danger, #da373c);
    animation: mp-pulse 1s ease-in-out infinite;
}

.mp-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.mp-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px;
}

.mp-action {
    padding: 9px 18px;
    border: 0;
    border-radius: 8px;
    color: #ffffff;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;
}

.mp-cancel {
    background: none;
    color: var(--text-muted, #949ba4);
}

.mp-cancel:hover {
    background: var(--background-modifier-hover, rgba(255, 255, 255, .06));
    color: var(--text-normal, #dbdee1);
}

.mp-start {
    background: var(--status-danger, #da373c);
}

.mp-start:hover {
    background: var(--button-danger-background-hover, #a12d2f);
}

.mp-start.mp-running {
    background: var(--background-modifier-selected, rgba(255, 255, 255, .08));
    color: var(--text-normal, #dbdee1);
}
`;

module.exports = class MessagePurger {
    constructor() {
        this.overlay = null;
        this.modal = null;
        this.status = null;
        this.fill = null;
        this.estimate = null;
        this.amountInput = null;
        this.delayInput = null;
        this.startButton = null;
        this.observer = null;
        this.running = false;

        this.inject = this.inject.bind(this);
        this.onOverlayPointerDown = this.onOverlayPointerDown.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    start() {
        this.userStore = Webpack.getStore("UserStore");
        this.channelStore = Webpack.getStore("ChannelStore");
        this.selectedChannelStore = Webpack.getStore("SelectedChannelStore");
        this.messageActions = Webpack.getByKeys("deleteMessage", "editMessage");
        this.messageFetcher = Webpack.getByKeys("fetchMessages");
        this.messageStore = Webpack.getStore("MessageStore");
        this.http = undefined;

        DOM.addStyle(NAME, STYLES);
        document.addEventListener("keydown", this.onKeyDown, true);

        this.observer = new MutationObserver(this.inject);
        this.observer.observe(document.body, { childList: true, subtree: true });

        this.inject();
    }

    stop() {
        this.running = false;
        this.observer?.disconnect();
        this.observer = null;
        document.removeEventListener("keydown", this.onKeyDown, true);
        this.close();

        document.querySelectorAll(`.${BUTTON_CLASS}`).forEach(button => button.remove());
        DOM.removeStyle(NAME);
    }

    async resolveHttp(channelId) {
        if (this.http !== undefined) {
            return this.http;
        }

        const candidates = Webpack.getModule(
            module => API_METHODS.every(key => typeof module?.[key] === "function"),
            { searchExports: true, first: false }
        ) ?? [];

        this.http = null;

        for (const candidate of candidates) {
            const probe = await candidate
                .get({ url: `/channels/${channelId}/messages`, query: { limit: 1 } })
                .catch(() => null);

            if (Array.isArray(probe?.body)) {
                this.http = candidate;
                break;
            }
        }

        return this.http;
    }

    inject() {
        const toolbar = document.querySelector(TOOLBAR_SELECTOR);

        if (!toolbar || toolbar.querySelector(`.${BUTTON_CLASS}`)) {
            return;
        }

        const button = document.createElement("div");
        button.className = BUTTON_CLASS;
        button.setAttribute("role", "button");
        button.setAttribute("tabindex", "0");
        button.setAttribute("aria-label", "Purge my messages");
        button.innerHTML = TRASH_ICON;
        button.addEventListener("click", () => this.open());

        this.matchNativeIcon(button, toolbar);
        toolbar.insertBefore(button, toolbar.firstChild);
    }

    matchNativeIcon(button, toolbar) {
        const reference = toolbar.querySelector("svg");

        if (!reference) {
            return;
        }

        let item = reference;

        while (item.parentElement && item.parentElement !== toolbar) {
            item = item.parentElement;
        }

        const iconStyles = getComputedStyle(reference);
        const itemStyles = getComputedStyle(item);
        const icon = button.firstElementChild;

        button.style.setProperty("--mp-color", iconStyles.color);
        button.style.margin = itemStyles.margin;
        button.style.width = `${item.offsetWidth}px`;
        button.style.height = `${item.offsetHeight}px`;
        icon.setAttribute("width", parseFloat(iconStyles.width));
        icon.setAttribute("height", parseFloat(iconStyles.height));
    }

    setButtonActive(active) {
        document.querySelectorAll(`.${BUTTON_CLASS}`).forEach(button => button.classList.toggle("mp-active", active));
    }

    getChannel() {
        return this.channelStore?.getChannel(this.selectedChannelStore?.getChannelId());
    }

    getChannelLabel(channel) {
        if (channel.name) {
            return `#${channel.name}`;
        }

        const user = this.userStore?.getUser(channel.recipients?.[0]);

        return user?.globalName || user?.username || "this conversation";
    }

    open() {
        const channel = this.getChannel();

        if (!channel || this.overlay) {
            return;
        }

        const modal = document.createElement("div");
        modal.className = "mp-modal";
        modal.innerHTML = `
            <div class="mp-header">
                <div class="mp-glyph">${TRASH_ICON}</div>
                <div class="mp-heading">
                    <div class="mp-title">Message Purger</div>
                    <div class="mp-target"></div>
                </div>
            </div>
            <div class="mp-body">
                <div class="mp-row">
                    <div class="mp-field">
                        <label class="mp-label">Messages</label>
                        <input class="mp-input mp-amount" type="number" min="1" step="1" value="50">
                    </div>
                    <div class="mp-field">
                        <label class="mp-label">Delay (seconds)</label>
                        <input class="mp-input mp-delay" type="number" min="0" step="0.5" value="2">
                    </div>
                </div>
                <div class="mp-chips"></div>
                <div class="mp-estimate"></div>
            </div>
            <div class="mp-progress"><div class="mp-fill"></div></div>
            <div class="mp-status"><span class="mp-dot"></span><span class="mp-text">Ready.</span></div>
            <div class="mp-footer">
                <button class="mp-action mp-cancel">Cancel</button>
                <button class="mp-action mp-start">Start</button>
            </div>
        `;

        modal.querySelector(".mp-target").textContent = this.getChannelLabel(channel);

        this.modal = modal;
        this.status = modal.querySelector(".mp-text");
        this.fill = modal.querySelector(".mp-fill");
        this.estimate = modal.querySelector(".mp-estimate");
        this.amountInput = modal.querySelector(".mp-amount");
        this.delayInput = modal.querySelector(".mp-delay");
        this.startButton = modal.querySelector(".mp-start");

        this.buildChips(modal.querySelector(".mp-chips"));
        this.amountInput.addEventListener("input", () => this.updateEstimate());
        this.delayInput.addEventListener("input", () => this.updateEstimate());
        modal.querySelector(".mp-cancel").addEventListener("click", () => this.close());
        this.startButton.addEventListener("click", () => this.onStart(channel));
        this.updateEstimate();

        this.overlay = document.createElement("div");
        this.overlay.className = "mp-overlay";
        this.overlay.appendChild(modal);
        this.overlay.addEventListener("pointerdown", this.onOverlayPointerDown);

        document.body.appendChild(this.overlay);
        this.setButtonActive(true);
        this.amountInput.focus();
        this.amountInput.select();
    }

    buildChips(container) {
        AMOUNT_PRESETS.forEach(preset => {
            const chip = document.createElement("button");
            chip.className = "mp-chip";
            chip.textContent = preset;
            chip.addEventListener("click", () => {
                this.amountInput.value = preset;
                this.updateEstimate();
            });

            container.appendChild(chip);
        });
    }

    updateEstimate() {
        const amount = this.readAmount();
        const delay = this.readDelay();

        [...this.modal.querySelectorAll(".mp-chip")].forEach(chip => {
            chip.classList.toggle("mp-selected", Number(chip.textContent) === amount);
        });

        if (!amount || isNaN(delay)) {
            this.estimate.textContent = "Enter an amount and a delay.";
            return;
        }

        this.estimate.textContent = `Up to ${amount} of your messages, about ${this.formatDuration(amount * delay)}.`;
    }

    readAmount() {
        const amount = parseInt(this.amountInput.value, 10);

        return amount > 0 ? amount : 0;
    }

    readDelay() {
        const delay = parseFloat(this.delayInput.value);

        return delay >= 0 ? delay : NaN;
    }

    formatDuration(seconds) {
        const total = Math.round(seconds);
        const minutes = Math.floor(total / 60);

        if (!minutes) {
            return `${total}s`;
        }

        return `${minutes}m ${total % 60}s`;
    }

    setBusy(busy) {
        this.modal?.classList.toggle("mp-busy", busy);
        this.amountInput.disabled = busy;
        this.delayInput.disabled = busy;
        this.startButton.textContent = busy ? "Stop" : "Start";
        this.startButton.classList.toggle("mp-running", busy);
    }

    close() {
        this.running = false;
        this.overlay?.remove();
        this.overlay = null;
        this.modal = null;
        this.status = null;
        this.fill = null;
        this.estimate = null;
        this.amountInput = null;
        this.delayInput = null;
        this.startButton = null;
        this.setButtonActive(false);
    }

    onOverlayPointerDown(event) {
        if (event.target === this.overlay) {
            this.close();
        }
    }

    onKeyDown(event) {
        if (event.key === "Escape" && this.overlay) {
            event.preventDefault();
            this.close();
        }
    }

    onStart(channel) {
        if (this.running) {
            this.running = false;
            this.setStatus("Stopping...");
            return;
        }

        if (!this.messageActions || !this.messageFetcher || !this.messageStore) {
            this.setStatus("Discord modules not found, restart the client.");
            return;
        }

        const amount = this.readAmount();
        const delay = this.readDelay();

        if (!amount || isNaN(delay)) {
            this.setStatus("Invalid amount or delay.");
            return;
        }

        this.running = true;
        this.setBusy(true);
        this.setProgress(0);
        this.purge(channel, amount, Math.round(delay * 1000));
    }

    setStatus(text) {
        if (this.status) {
            this.status.textContent = text;
        }
    }

    setProgress(ratio) {
        if (this.fill) {
            this.fill.style.width = `${Math.round(ratio * 100)}%`;
        }
    }

    async purge(channel, amount, delay) {
        try {
            this.setStatus("Searching messages...");

            const messages = await this.collect(channel, amount);

            if (!messages.length) {
                this.setStatus("No message found.");
                this.finish();
                return;
            }

            let deleted = 0;

            for (const message of messages) {
                if (!this.running) {
                    break;
                }

                await this.messageActions.deleteMessage(channel.id, message.id);
                deleted++;
                this.setProgress(deleted / messages.length);
                this.setStatus(`Deleted ${deleted} of ${messages.length}`);

                if (deleted < messages.length) {
                    await this.sleep(delay);
                }
            }

            this.setStatus(`Finished. Deleted ${deleted} messages.`);
        } catch (error) {
            this.setStatus(`Error: ${error?.body?.message ?? error?.message ?? "request failed"}`);
        }

        this.finish();
    }

    finish() {
        this.running = false;

        if (this.modal) {
            this.setBusy(false);
        }
    }

    async collect(channel, amount) {
        const userId = this.userStore.getCurrentUser().id;
        const http = await this.resolveHttp(channel.id);

        if (http) {
            const found = await this.collectFromSearch(channel, userId, amount);

            this.setProgress(0);

            if (found.length) {
                return found;
            }
        }

        this.setStatus("Scanning history...");

        return this.collectFromHistory(channel, userId, amount);
    }

    async collectFromSearch(channel, userId, amount) {
        const found = [];
        let offset = 0;
        let retries = 0;

        while (this.running && found.length < amount) {
            const body = await this.search(channel, userId, offset);

            if (!body || body.code === INDEXING_CODE) {
                retries++;

                if (retries > SEARCH_RETRIES) {
                    return found;
                }

                this.setStatus("Server is indexing, waiting...");
                await this.sleep((body?.retry_after ?? 2) * 1000);
                continue;
            }

            retries = 0;
            const groups = body.messages ?? [];

            if (!groups.length) {
                break;
            }

            for (const group of groups) {
                this.keep(group.find(entry => entry.hit), userId, amount, found);
            }

            offset += SEARCH_PAGE_SIZE;
            this.setProgress(found.length / amount);
            this.setStatus(`Found ${found.length} messages...`);

            if (offset >= (body.total_results ?? 0)) {
                break;
            }

            await this.sleep(SEARCH_INTERVAL);
        }

        return found;
    }

    async collectFromHistory(channel, userId, amount) {
        const found = [];
        const seen = new Set();
        let before = null;
        let pages = 0;

        while (this.running && found.length < amount && pages < HISTORY_PAGES) {
            const messages = await this.fetchPage(channel.id, before);
            const fresh = messages.filter(message => !seen.has(message.id));

            if (!fresh.length) {
                break;
            }

            fresh.forEach(message => seen.add(message.id));
            [...fresh].reverse().forEach(message => this.keep(message, userId, amount, found));

            before = fresh[0].id;
            pages++;
            this.setProgress(found.length / amount);
            this.setStatus(`Found ${found.length} messages...`);

            await this.sleep(SEARCH_INTERVAL);
        }

        this.setProgress(0);

        return found;
    }

    async fetchPage(channelId, before) {
        const options = { channelId, limit: HISTORY_PAGE_SIZE };

        if (before) {
            options.before = before;
        }

        await this.messageFetcher.fetchMessages(options);
        await this.sleep(STORE_DELAY);

        return this.messageStore.getMessages(channelId)?.toArray() ?? [];
    }

    keep(message, userId, amount, found) {
        if (found.length >= amount || !message || message.author.id !== userId) {
            return;
        }

        if (!DELETABLE_TYPES.includes(message.type)) {
            return;
        }

        found.push(message);
    }

    async search(channel, userId, offset) {
        const guildId = channel.guild_id;
        const query = { author_id: userId, offset, sort_by: "timestamp", sort_order: "desc" };

        if (guildId) {
            query.channel_id = channel.id;
            query.include_nsfw = true;
        }

        const url = guildId ? `/guilds/${guildId}/messages/search` : `/channels/${channel.id}/messages/search`;
        const response = await this.http.get({ url, query });

        return response?.body ?? null;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
