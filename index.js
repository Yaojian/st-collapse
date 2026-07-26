import { chat, eventSource, event_types, messageFormatting, updateMessageBlock, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings, renderExtensionTemplateAsync } from '../../../extensions.js';

const processedMessages = new Set();
const defaultSettings = {
    tag: 'continuity',
    label: 'Continuity',
};

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let cachedTag = null;
let cachedRegex = null;

function getTag() {
    return extension_settings.continuity_collapse?.tag || defaultSettings.tag;
}

function getRegex() {
    const tag = getTag();
    if (cachedTag === tag && cachedRegex) return cachedRegex;
    cachedTag = tag;
    cachedRegex = new RegExp(`<\\s*${escapeRegex(tag)}\\s*>([\\s\\S]*?)<\\s*\\/\\s*${escapeRegex(tag)}\\s*>`, 'i');
    return cachedRegex;
}

function getLabel() {
    return extension_settings.continuity_collapse?.label || defaultSettings.label;
}

function includesTag(mes) {
    if (!mes) return false;
    const tag = getTag();
    return mes.includes(`<${tag}>`);
}

function processMessage(messageId) {
    const message = chat[messageId];
    if (!message || message.is_user) return false;
    if (processedMessages.has(messageId)) return false;

    const regex = getRegex();
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
    summary.textContent = getLabel();
    details.appendChild(summary);

    const content = document.createElement('div');
    content.innerHTML = messageFormatting(message.extra.continuity_text, '', false, false, messageId, {}, false);
    details.appendChild(content);

    textEl.parentNode.insertBefore(details, textEl.nextSibling);
}

function processExistingMessages() {
    if (!chat || chat.length === 0) return;
    chat.forEach((msg, idx) => {
        if (!msg.is_user && includesTag(msg.mes)) {
            processMessage(idx);
        }
    });
}

function loadSettings() {
    if (!extension_settings.continuity_collapse) {
        extension_settings.continuity_collapse = {};
    }
    for (const key in defaultSettings) {
        if (!Object.hasOwn(extension_settings.continuity_collapse, key)) {
            extension_settings.continuity_collapse[key] = defaultSettings[key];
        }
    }
    $('#cc_tag').val(extension_settings.continuity_collapse.tag);
    $('#cc_label').val(extension_settings.continuity_collapse.label);
}

export async function init() {
    const html = await renderExtensionTemplateAsync('third-party/st-collapse', 'settings');
    $('#extensions_settings2').append(html);

    $('#cc_tag').on('input', function () {
        cachedTag = null;
        cachedRegex = null;
        extension_settings.continuity_collapse.tag = $(this).val();
        saveSettingsDebounced();
    });
    $('#cc_label').on('input', function () {
        extension_settings.continuity_collapse.label = $(this).val();
        saveSettingsDebounced();
    });

    loadSettings();

    eventSource.on(event_types.MESSAGE_RECEIVED, processMessage);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (messageId) => {
        injectContinuityElement(messageId);
        if (includesTag(chat[messageId]?.mes)) {
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
