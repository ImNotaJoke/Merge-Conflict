type InputMode = "keyboard" | "mouse";

interface GameSettings {
    volume: number;
    inputMode: InputMode;
}

const SETTINGS_STORAGE_KEY = "merge-conflict-settings";
const DEFAULT_SETTINGS: GameSettings = {
    volume: 0.5,
    inputMode: "keyboard",
};

const video = document.getElementById("bgVideo") as HTMLVideoElement | null;
const volumeSlider = document.getElementById("volumeControl") as HTMLInputElement | null;
const settingsBtn = document.querySelectorAll(".settingsBtn");
const settingsPanel = document.getElementById("settingsPanel") as HTMLDivElement | null;
const inputKeyboard = document.getElementById("inputKeyboard") as HTMLInputElement | null;
const inputMouse = document.getElementById("inputMouse") as HTMLInputElement | null;
const closeSettingsBtn = document.getElementById("close-settings") as HTMLButtonElement | null;

let appliedSettings: GameSettings = loadSettings();
let draftSettings: GameSettings = { ...appliedSettings };

function loadSettings(): GameSettings {
    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
        return { ...DEFAULT_SETTINGS };
    }

    try {
        const parsed = JSON.parse(rawSettings) as Partial<GameSettings>;
        const inputMode = parsed.inputMode === "mouse" ? "mouse" : "keyboard";
        const volume = Number.isFinite(parsed.volume)
            ? Math.min(1, Math.max(0, parsed.volume as number))
            : DEFAULT_SETTINGS.volume;

        return {
            volume,
            inputMode,
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings(settings: GameSettings): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function syncControlsFromSettings(settings: GameSettings): void {
    if (volumeSlider) {
        volumeSlider.value = settings.volume.toString();
    }
    if (inputKeyboard) {
        inputKeyboard.checked = settings.inputMode === "keyboard";
    }
    if (inputMouse) {
        inputMouse.checked = settings.inputMode === "mouse";
    }
}

function applySettingsToMedia(settings: GameSettings): void {
    if (!video) {
        return;
    }

    video.volume = settings.volume;
    video.muted = settings.volume === 0;
}

function publishSettings(): void {
    window.dispatchEvent(new CustomEvent("gameSettingsApplied", { detail: { ...appliedSettings } }));
}

function openSettingsPanel(): void {
    if (!settingsPanel) {
        return;
    }

    draftSettings = { ...appliedSettings };
    syncControlsFromSettings(draftSettings);
    settingsPanel.classList.remove("hidden");
}

function closeSettingsPanel(): void {
    if (settingsPanel) {
        settingsPanel.classList.add("hidden");
    }
}

function commitSettings(): void {
    appliedSettings = { ...draftSettings };
    saveSettings(appliedSettings);
    applySettingsToMedia(appliedSettings);
    publishSettings();
    closeSettingsPanel();
}

function handleVolumeInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    draftSettings.volume = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : draftSettings.volume;
}

function handleInputModeChange(): void {
    draftSettings.inputMode = inputMouse?.checked ? "mouse" : "keyboard";
}

export function getInputMode(): InputMode {
    return appliedSettings.inputMode;
}

export function initializeEventListeners(): void {
    syncControlsFromSettings(appliedSettings);
    applySettingsToMedia(appliedSettings);

    if (settingsBtn) {
        settingsBtn.forEach((btn) => {
            btn.addEventListener('click', openSettingsPanel);
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener("input", handleVolumeInput);
    }

    if (inputKeyboard) {
        inputKeyboard.addEventListener("change", handleInputModeChange);
    }

    if (inputMouse) {
        inputMouse.addEventListener("change", handleInputModeChange);
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener("click", commitSettings);
    }

    publishSettings();
}
