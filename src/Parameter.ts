const video = document.getElementById('bgVideo') as HTMLVideoElement | null;
const volumeSlider = document.getElementById('volumeControl') as HTMLInputElement | null;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;
const settingsPanel = document.getElementById('settingsPanel') as HTMLDivElement | null;

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
}