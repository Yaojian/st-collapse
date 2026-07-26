import { chat, eventSource, event_types, messageFormatting, updateMessageBlock } from '../../../../script.js';

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

    const originalMes = message.mes;
    message.mes = message.mes.replace(regex, '').trim();

    try {
        updateMessageBlock(messageId, message);
        injectContinuityElement(messageId);
    } catch {
        message.mes = originalMes;
        return false;
    }

    processedMessages.add(messageId);
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

    const summary = document.createElement('summary');
    summary.textContent = 'Continuity';
    details.appendChild(summary);

    const content = document.createElement('div');
    content.innerHTML = messageFormatting(message.extra.continuity_text, '', false, false, messageId, {}, false);
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
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (messageId) => {
        injectContinuityElement(messageId);
        if (chat[messageId]?.mes?.includes('<continuity>')) {
            processMessage(messageId);
        }
    });
    eventSource.on(event_types.MESSAGE_SWIPED, (messageId) => {
        processedMessages.delete(messageId);
    });
    eventSource.on(event_types.CHAT_CHANGED, processExistingMessages);
    eventSource.on(event_types.APP_READY, processExistingMessages);

    processExistingMessages();
}
