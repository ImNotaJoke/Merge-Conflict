const video = document.getElementById('bgVideo') as HTMLVideoElement | null;
const volumeSlider = document.getElementById('volumeControl') as HTMLInputElement | null;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;
const settingsPanel = document.getElementById('settingsPanel') as HTMLDivElement | null;
const inputKeyboard = document.getElementById('inputKeyboard') as HTMLInputElement | null;
const inputMouse = document.getElementById('inputMouse') as HTMLInputElement | null;
const closeSettingsBtn = document.getElementById('close-settings') as HTMLButtonElement | null;

if (video && volumeSlider) {
    video.volume = parseFloat(volumeSlider.value);
}

if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', (): void => {
        settingsPanel.classList.toggle('hidden');
    });
}

if (volumeSlider && video) {
    volumeSlider.addEventListener('input', (event: Event): void => {
        const target = event.target as HTMLInputElement;
        const volumeValue: number = parseFloat(target.value);
        
        video.volume = volumeValue;
        
        if (volumeValue > 0) {
            video.muted = false;
        } else {
            video.muted = true;
        }
    });

    if (inputKeyboard && inputMouse) {
        inputKeyboard.addEventListener('change', (event: Event): void => {
            if (inputKeyboard.checked) {
                console.log('Mode de contrôle : Clavier');
            }
            event.preventDefault();
        });
        inputMouse.addEventListener('change', (event: Event): void => {
            if (inputMouse.checked) {
                console.log('Mode de contrôle : Souris');
            }
            event.preventDefault();
        });
    
    
    }
    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.addEventListener('click', (): void => {
            settingsPanel.classList.add('hidden');
        });
    }

}