import { chat, eventSource, event_types, updateMessageBlock } from '../../../script.js';

const processedMessages = new Set();

function processMessage(messageId) {
    const message = chat[messageId];
    if (!message || message.is_user) return false;
    if (processedMessages.has(messageId)) return false;

    const regex = /<continuity>([\s\S]*?)<\/continuity>/;
    const match = message.mes.match(regex);
    if (!match) return false;

    if (typeof message.extra !== 'object') message.extra = {};
    message.extra.continuity_text = match[1].trim();
    message.mes = message.mes.replace(regex, '').trim();

    processedMessages.add(messageId);

    updateMessageBlock(messageId, message);
    injectContinuityElement(messageId);
    return true;
}

function injectContinuityElement(messageId) {
    const message = chat[messageId];
    if (!message?.extra?.continuity_text) return;

    const block = document.querySelector(`#chat .mes[mesid="${messageId}"]`);
    if (!block) return;
    if (block.querySelector('.mes_continuity_details')) return;

    const textEl = block.querySelector('.mes_text');
    if (!textEl) return;

    const details = document.createElement('details');
    details.className = 'mes_continuity_details';
    details.open = false;

    const summary = document.createElement('summary');
    summary.className = 'mes_continuity_summary flex-container';
    summary.innerHTML = (
        '<div class="mes_continuity_header flex-container">' +
            '<span>Continuity</span>' +
            '<div class="mes_continuity_arrow fa-solid fa-chevron-up"></div>' +
        '</div>'
    );

    const content = document.createElement('div');
    content.className = 'mes_continuity';
    content.textContent = message.extra.continuity_text;

    details.appendChild(summary);
    details.appendChild(content);

    textEl.parentNode.insertBefore(details, textEl.nextSibling);
}

function processExistingMessages() {
    if (!chat || chat.length === 0) return;
    chat.forEach((msg, idx) => {
        if (!msg.is_user && msg.mes?.includes('<continuity>')) {
            processMessage(idx);
        }
    });
}

export function init() {
    eventSource.on(event_types.MESSAGE_RECEIVED, processMessage);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, injectContinuityElement);
    eventSource.on(event_types.MESSAGE_SWIPED, (messageId) => {
        processedMessages.delete(messageId);
    });
    eventSource.on(event_types.CHAT_CHANGED, processExistingMessages);
    eventSource.on(event_types.APP_READY, processExistingMessages);

    processExistingMessages();
}
