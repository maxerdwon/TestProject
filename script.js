document.addEventListener('DOMContentLoaded', () => {

    const elements = {
        imageUploadInput: document.getElementById('imageUploadInput'),
        chooseFileButton: document.getElementById('chooseFileButton'),
        imagePreview: document.getElementById('imagePreview'),
        imagePreviewPlaceholder: document.getElementById('imagePreviewPlaceholder'),
        dropArea: document.getElementById('dropArea'),
        modelCards: document.querySelectorAll('.model-card'),
        generatePromptButton: document.getElementById('generatePromptButton'),
        promptResult: document.getElementById('promptResult'),
        copyPromptButton: document.getElementById('copyPromptButton'),
        editPromptButton: document.getElementById('editPromptButton'),
        buttonTextSpan: document.querySelector('#generatePromptButton .button-text'),
        usageCounter: document.getElementById('usageCounter'),
        promptLanguage: document.getElementById('promptLanguage'),
    };

    const state = {
        DAILY_LIMIT: 15,
        usesToday: 0,
        loadedImageBase64: null,
        currentModel: 'general',
        isGenerating: false,
    };

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please upload a valid image file (PNG, JPG, WEBP).');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.imagePreview.src = e.target.result;
            elements.imagePreview.style.display = 'block';
            elements.imagePreviewPlaceholder.style.display = 'none';
            state.loadedImageBase64 = e.target.result; 
        };
        reader.readAsDataURL(file);
    };

    const updateGenerateButtonUI = () => {
        const limitReached = state.usesToday >= state.DAILY_LIMIT;
        elements.generatePromptButton.disabled = limitReached || state.isGenerating;

        if (state.isGenerating) {
            elements.generatePromptButton.classList.add('loading');
            elements.buttonTextSpan.textContent = 'Generating...';
        } else {
            elements.generatePromptButton.classList.remove('loading');
            elements.buttonTextSpan.textContent = 'Generate Prompt';
        }

        if (elements.usageCounter) {
            elements.usageCounter.textContent = `Daily Usage: ${state.usesToday}/${state.DAILY_LIMIT}`;
        }
    };

    const checkDailyReset = () => {
        const today = new Date().toISOString().split('T')[0];
        const lastUseDate = localStorage.getItem('promptAppLastUseDate');
        if (lastUseDate !== today) {
            state.usesToday = 0;
            localStorage.setItem('promptAppUsesToday', '0');
            localStorage.setItem('promptAppLastUseDate', today);
        } else {
            state.usesToday = parseInt(localStorage.getItem('promptAppUsesToday') || '0', 10);
        }
        updateGenerateButtonUI();
    };

    // --- EVENT LISTENERS ---
    if (elements.chooseFileButton) {
        elements.chooseFileButton.addEventListener('click', () => elements.imageUploadInput.click());
    }
    if (elements.imageUploadInput) {
        elements.imageUploadInput.addEventListener('change', (e) => e.target.files.length && handleFile(e.target.files[0]));
    }
    if (elements.dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, () => elements.dropArea.style.borderColor = 'var(--primary-accent-color)');
        });
        ['dragleave', 'drop'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, () => elements.dropArea.style.borderColor = 'var(--border-color)');
        });
        elements.dropArea.addEventListener('drop', (e) => {
            e.dataTransfer.files.length && handleFile(e.dataTransfer.files[0]);
        });
    }

    elements.modelCards.forEach(card => {
        card.addEventListener('click', () => {
            elements.modelCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.currentModel = card.dataset.model;
        });
    });

    if (elements.generatePromptButton) {
        elements.generatePromptButton.addEventListener('click', async () => {
            if (state.usesToday >= state.DAILY_LIMIT) {
                alert('You have reached your daily usage limit.');
                return;
            }
            if (!state.loadedImageBase64) {
                alert('Please upload an image before generating a prompt.');
                return;
            }

            state.isGenerating = true;
            updateGenerateButtonUI();
            elements.promptResult.value = ""; 

            try {
                const response = await fetch('http://localhost:5000/api/generate-prompt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image_base64: state.loadedImageBase64,
                        model: state.currentModel
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "An unknown server error" }));
                    throw new Error(errorData.error || `Server responded with status: ${response.status}`);
                }
                const data = await response.json();
                elements.promptResult.value = data.prompt || 'Failed to generate prompt.';
                elements.copyPromptButton.style.display = 'inline-flex';
                elements.editPromptButton.style.display = 'inline-flex';

                state.usesToday++;
                localStorage.setItem('promptAppUsesToday', state.usesToday.toString());

            } catch (error) {
                console.error(error);
                elements.promptResult.value = 'Error: ' + error.message;
            } finally {
                state.isGenerating = false;
                updateGenerateButtonUI();
            }
        });
    }

    if(elements.copyPromptButton) {
        const buttonText = elements.copyPromptButton.querySelector('.button-text');
        const defaultIcon = elements.copyPromptButton.querySelector('.icon-default');
        const successIcon = elements.copyPromptButton.querySelector('.icon-success');

        elements.copyPromptButton.addEventListener('click', function() {
            if (!elements.promptResult.value || this.classList.contains('success')) return;
            navigator.clipboard.writeText(elements.promptResult.value).then(() => {
                const originalText = "Copy Prompt";
                this.classList.add('success');
                buttonText.textContent = "Copied!";
                defaultIcon.style.display = 'none';
                successIcon.style.display = 'inline-block';
                setTimeout(() => {
                    this.classList.remove('success');
                    buttonText.textContent = originalText;
                    defaultIcon.style.display = 'inline-block';
                    successIcon.style.display = 'none';
                }, 2000);
            });
        });
    }

    if (elements.editPromptButton) {
        elements.editPromptButton.addEventListener('click', () => {
            elements.promptResult.readOnly = false;
            elements.promptResult.focus();
        });
        elements.promptResult.addEventListener('blur', () => elements.promptResult.readOnly = true);
    }

    // --- Accordion Logic ---
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            accordionItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // --- INITIALIZATION ---
    checkDailyReset();
});