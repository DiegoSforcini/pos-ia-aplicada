export class FormController {
    constructor(aiService, translationService, view) {
        this.aiService = aiService;
        this.translationService = translationService;
        this.view = view;
        this.isGenerating = false;
    }

    setupEventListeners() {
        // Update display values for range inputs
        this.view.onTemperatureChange((e) => {
            this.view.updateTemperatureDisplay(e.target.value);
        });

        this.view.onTopKChange((e) => {
            this.view.updateTopKDisplay(e.target.value);
        });

        // File input handlers
        this.view.onFileChange((event) => {
            this.view.handleFilePreview(event);
        });

        this.view.onFileButtonClick(() => {
            this.view.triggerFileInput();
        });

        // Form submit handler
        this.view.onFormSubmit(async (event) => {
            event.preventDefault();

            if (this.isGenerating) {
                this.stopGeneration();
                return;
            }

            await this.handleSubmit();
        });
    }

    async handleSubmit() {
        const question = this.view.getQuestionText();

        if (!question.trim()) {
            return;
        }

        // Get parameters from form
        const temperature = this.view.getTemperature();
        const topK = this.view.getTopK();
        const file = this.view.getFile();

        console.log('Using parameters:', { temperature, topK });
        console.log('File selected:', file ? { name: file.name, type: file.type, size: file.size } : 'none');

        // Change button to stop mode
        this.toggleButton(true);

        let processingMessage = 'Processing your question...';
        if (file) {
            processingMessage += ` (com arquivo: ${file.name})`;
        }
        this.view.setOutput(processingMessage);

        try {
            const aiResponseChunks = await this.aiService.createSession(
                question,
                temperature,
                topK,
                file
            );

            this.view.setOutput('');

            let fullResponse = '';
            for await (const chunk of aiResponseChunks) {
                if (this.aiService.isAborted()) {
                    break;
                }
                console.log('Received chunk:', chunk);
                fullResponse += chunk;
                this.view.setOutput(fullResponse);
            }

            // Translate the full response to Portuguese
            if (fullResponse && !this.aiService.isAborted()) {
                this.view.setOutput('Traduzindo resposta...');
                const translatedResponse = await this.translationService.translateToPortuguese(fullResponse);
                this.view.setOutput(translatedResponse);
            }
        } catch (error) {
            console.error('Error during AI generation:', error);
            
            // Provide specific error messages
            let errorMessage = error.message;
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Modelo de IA não disponível. Verifique:\n' +
                    '1. Chrome 123+ com flags ativados em chrome://flags/\n' +
                    '2. Reinicie completamente o Chrome\n' +
                    '3. Verifique espaço em disco (~5GB)\n' +
                    '4. Abra DevTools e execute: await LanguageModel.availability()';
            } else if (error.message.includes('capability')) {
                errorMessage = 'Capacidade de IA não suportada. O modelo pode estar em download.';
            } else if (error.message.includes('Image not supported') || error.message.includes('not initialized')) {
                errorMessage = 'Arquivo (imagem/áudio) não é suportado. ' +
                    'O modelo está em modo texto-only.\n' +
                    'Tente enviar apenas uma pergunta de texto.';
            }
            
            this.view.setOutput(`Erro: ${errorMessage}`);
        }

        this.toggleButton(false);
    }

    stopGeneration() {
        this.aiService.abort();
        this.toggleButton(false);
    }

    toggleButton(isGenerating) {
        this.isGenerating = isGenerating;

        if (isGenerating) {
            this.view.setButtonToStopMode();
        } else {
            this.view.setButtonToSendMode();
        }
    }
}
