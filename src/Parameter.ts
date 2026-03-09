const video = document.getElementById('bgVideo') as HTMLVideoElement | null;
const volumeSlider = document.getElementById('volumeControl') as HTMLInputElement | null;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;
const settingsPanel = document.getElementById('settingsPanel') as HTMLDivElement | null;
const inputKeyboard = document.getElementById('inputKeyboard') as HTMLInputElement | null;
const inputMouse = document.getElementById('inputMouse') as HTMLInputElement | null;
const closeSettingsBtn = document.getElementById('close-settings') as HTMLButtonElement | null;

function initializeVolume(): void {
    if (video && volumeSlider) {
        video.volume = parseFloat(volumeSlider.value);
    }
}


function toggleSettingsPanel(): void {
    if (settingsPanel) {
        settingsPanel.classList.toggle('hidden');
    }
}

function handleVolumeChange(event: Event): void {
    if (!video) return;
    
    const target = event.target as HTMLInputElement;
    const volumeValue: number = parseFloat(target.value);
    
    video.volume = volumeValue;
    video.muted = volumeValue === 0;
}

function handleKeyboardModeChange(event: Event): void {
    if (inputKeyboard?.checked) {
        console.log('Mode de contrôle : Clavier');
    }
    event.preventDefault();
}

function handleMouseModeChange(event: Event): void {
    if (inputMouse?.checked) {
        console.log('Mode de contrôle : Souris');
    }
    event.preventDefault();
}

function closeSettingsPanel(): void {
    if (settingsPanel) {
        settingsPanel.classList.add('hidden');
    }
}

export function initializeEventListeners(): void {
    initializeVolume();
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleSettingsPanel);
    }
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', handleVolumeChange);
    }
    
    if (inputKeyboard) {
        inputKeyboard.addEventListener('change', handleKeyboardModeChange);
    }
    
    if (inputMouse) {
        inputMouse.addEventListener('change', handleMouseModeChange);
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsPanel);
    }
}
