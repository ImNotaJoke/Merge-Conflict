import { player_hurt_sound, ennemy_death_sound, ennemy_hit_sound, bullet_shot_sound, bonus_pickup_sound } from "./game/gameRendering";
import type { GameSettings, InputMode } from "../common/types";

const SETTINGS_STORAGE_KEY = "merge-conflict-settings";
const DEFAULT_SETTINGS: GameSettings = {
    volume: 0.5,
    soundEffects: 0.5,
    inputMode: "keyboard",
};
const soundEffects = [player_hurt_sound, ennemy_death_sound, ennemy_hit_sound, bullet_shot_sound, bonus_pickup_sound];

const video = document.getElementById("bgVideo") as HTMLVideoElement | null;
const volumeSlider = document.getElementById("volumeControl") as HTMLInputElement | null;
const volumeSliderSoundEffets: HTMLInputElement = document.querySelector('.volumeControl-soundEffects')!;
const settingsBtn = document.querySelectorAll(".settingsBtn");
const settingsPanel = document.getElementById("settingsPanel") as HTMLDivElement | null;
const inputKeyboard = document.getElementById("inputKeyboard") as HTMLInputElement | null;
const inputMouse = document.getElementById("inputMouse") as HTMLInputElement | null;
const closeSettingsBtn = document.getElementById("close-settings") as HTMLButtonElement | null;
const audio: HTMLAudioElement = document.querySelector('.game-background-music')!;

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
        const soundEffects = Number.isFinite(parsed.volume)
            ? Math.min(1, Math.max(0, parsed.soundEffects as number))
            : DEFAULT_SETTINGS.soundEffects;

        return {
            volume,
            soundEffects,
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
    if(volumeSliderSoundEffets) {
        volumeSliderSoundEffets.value = settings.soundEffects.toString();
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
    audio.volume = settings.volume;
    video.muted = settings.volume === 0;
    audio.muted = settings.volume === 0;

    soundEffects.forEach((elt) => {
        elt.volume = settings.soundEffects;
    })
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

function handleVolumeSoundeffects(event: Event) {
    event.preventDefault();
    const value = parseFloat(volumeSliderSoundEffets.value);
    draftSettings.soundEffects = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : draftSettings.soundEffects;
}

function handleInputModeChange(): void {
    draftSettings.inputMode = inputMouse?.checked ? "mouse" : "keyboard";
}

export function getInputMode(): InputMode {
    return appliedSettings.inputMode;
}

export function initializeEventListeners(): void {
    appliedSettings = loadSettings();
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

    if(volumeSliderSoundEffets) {
        volumeSliderSoundEffets.addEventListener('input', handleVolumeSoundeffects);
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
