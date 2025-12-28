/**
 * Quiz Manager
 * Handles quiz rendering and answer checking with retry functionality
 */

class QuizManager {
    constructor() {
        this.data = null;
        this.urls = null;
        this.container = document.getElementById('quiz-container');
        this.modal = document.getElementById('feedback-modal');
        this.modalMessage = document.getElementById('modal-message');
        this.modalCloseBtn = document.getElementById('modal-close-btn');
        this.answeredQuestions = new Set();
        this.firstAttemptAnswers = new Map();
        this.correctlyAnswered = new Set(); // Track first attempts for scoring
    }
    
    async init() {
        this.showLoading();
        
        try {
            this.data = await DataLoader.getQuiz();
            this.urls = await DataLoader.load('glossary-urls.json');
            
            if (!this.data || !this.data.questions) {
                throw new Error('Invalid quiz data structure');
            }
            
            if (!this.urls) {
                console.warn('Failed to load glossary URLs - citations will not be clickable');
                this.urls = {};
            }
            
            this.render();
            this.restoreQuizStateFromStorage();
            this.scrollToTopSmooth();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to load quiz:', error);
            this.showError('Unable to load quiz questions. Please check your connection and try again.');
        }
    }
    
    showLoading() {
        if (this.container) {
            this.container.innerHTML = Utils.createLoadingHTML();
        }
    }
    
    showError(message) {
        if (this.container) {
            this.container.innerHTML = Utils.createErrorHTML(message);
        }
    }
    
    setupEventListeners() {
        this.modalCloseBtn.addEventListener('click', () => this.hideModal());
        
        // Close modal on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.hideModal();
            }
        });
        
        // Handle quiz option clicks
        this.container.addEventListener('click', (e) => {
            const option = e.target.closest('.check-option');
            if (option) {
                const quizId = e.target.closest('.knowledge-check').dataset.quizId;
                if (quizId) {
                    // If question was already answered, just re-show feedback
                    if (this.answeredQuestions.has(quizId)) {
                        this.reviewAnswer(option, quizId);
                    } else {
                        this.handleAnswer(option, quizId);
                    }
                }
            }
            
            // Handle retry button
            const retryBtn = e.target.closest('.retry-button');
            if (retryBtn) {
                const quizId = retryBtn.dataset.quizId;
                this.resetQuestion(quizId);
            }
        });
        
        // Handle keyboard for quiz options
        this.container.addEventListener('keydown', (e) => {
            const option = e.target.closest('.check-option');
            if (option && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const quizId = e.target.closest('.knowledge-check').dataset.quizId;
                if (quizId) {
                    if (this.answeredQuestions.has(quizId)) {
                        this.reviewAnswer(option, quizId);
                    } else {
                        this.handleAnswer(option, quizId);
                    }
                }
            }
            
            // Handle retry button keyboard
            const retryBtn = e.target.closest('.retry-button');
            if (retryBtn && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const quizId = retryBtn.dataset.quizId;
                this.resetQuestion(quizId);
            }
        });
    }
    
    /**
     * Convert CFR citations in text to clickable links
     * Preserves bold formatting from <strong> tags
     */
    linkifyCitations(text) {
        if (!text || !this.urls) return text;
        
        // Pattern to match CFR citations with optional subsections
        // Examples: "45 CFR 46.113", "45 CFR 46 Subpart D", "45 CFR 46.111(a)(1)"
        const cfrPattern = /(\d+\s+CFR\s+\d+(?:\s+Subpart\s+[A-Z])?(?:\.\d+)?(?:\([a-z]\))?(?:\(\d+\))?)/gi;
        
        // Pattern to match "Belmont Report"
        const belmontPattern = /(Belmont\s+Report)/gi;
        
        // Collect all matches from both patterns
        let result = text;
        const cfrMatches = [...text.matchAll(cfrPattern)];
        const belmontMatches = [...text.matchAll(belmontPattern)];
        const allMatches = [...cfrMatches, ...belmontMatches];
        
        // Sort by position in reverse order to preserve string positions during replacement
        allMatches.sort((a, b) => b.index - a.index);
        
        // Process matches in reverse order
        for (const match of allMatches) {
            const citation = match[0];
            const url = this.urls[citation];
            
            if (url) {
                const startPos = match.index;
                const endPos = startPos + citation.length;
                
                // Check if citation is inside <strong> tags
                const beforeText = text.substring(0, startPos);
                
                // Count open and unclosed <strong> tags before this position
                const strongOpenBefore = (beforeText.match(/<strong>/gi) || []).length;
                const strongCloseBefore = (beforeText.match(/<\/strong>/gi) || []).length;
                const isInsideStrong = strongOpenBefore > strongCloseBefore;
                
                // Create the link with appropriate styling
                let link;
                if (isInsideStrong) {
                    // Bold link (citation is already inside <strong>)
                    link = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-600 hover:text-blue-800 hover:underline">${citation}</a>`;
                } else {
                    // Regular link
                    link = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline">${citation}</a>`;
                }
                
                result = result.substring(0, startPos) + link + result.substring(endPos);
            }
        }
        
        return result;
    }
    
    showModal(message) {
        // Greenify “Correct!”
        // Linkify CFR citations
        message = this.linkifyCitations(message);

        message = message.replace(/(^|>)(\s*Correct!\s*)/i, '$1<span class="font-bold text-green-600">Correct!</span> ');

        // Store the element that had focus before modal opened
        this.lastFocusedElement = document.activeElement;
        
        this.modalMessage.innerHTML = message;
        
        // Enhance citation links with read/star functionality
        if (window.linkEnhancer && this.currentQuestion) {
            const citationLinks = this.modalMessage.querySelectorAll('a[href]');
            citationLinks.forEach(link => {
                const context = {
                    type: 'knowledge-check',
                    title: link.textContent.trim(),
                    source: 'Knowledge Checks',
                    description: `Q${this.currentQuestion.number}: ${this.currentQuestion.question}`
                };
                window.linkEnhancer.enhanceLink(link, context);
            });
        }
        
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        
        // Focus the close button for accessibility
        setTimeout(() => window.silentFocus(this.modalCloseBtn), 100);
        
        // Announce to screen readers
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message.replace(/<[^>]*>/g, '');
        }
    }
    
    hideModal() {
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
        
        // Clear live region
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = '';
        }
        
        // Return focus to where it was before modal, or to a sensible default
        if (this.lastFocusedElement && document.contains(this.lastFocusedElement)) {
            // Find the next focusable element in the quiz
            const quizContainer = this.lastFocusedElement.closest('.knowledge-check');
            if (quizContainer) {
                // Try to focus the retry button if it exists
                const retryBtn = quizContainer.querySelector('.retry-button:not(.hidden)');
                if (retryBtn) {
                    window.silentFocus(retryBtn);
                } else {
                    // Otherwise focus the next question's first option
                    const nextQuestion = quizContainer.nextElementSibling;
                    if (nextQuestion) {
                        const firstOption = nextQuestion.querySelector('.check-option');
                        if (firstOption) {
                            window.silentFocus(firstOption);
                        }
                    }
                }
            }
        }
    }
    
    handleAnswer(selectedOption, quizId) {
        const isCorrect = selectedOption.hasAttribute('data-correct');
        const parentContainer = selectedOption.closest('.knowledge-check');
        const optionsContainer = parentContainer.querySelector('.quiz-options');
        const itemId = (parentContainer && parentContainer.dataset.itemId) ? parentContainer.dataset.itemId : `quiz-q${quizId}`;
        const options = Array.from(optionsContainer.querySelectorAll('.check-option'));
        const selectedIndex = options.indexOf(selectedOption);
        
        
        // Save KC state
        try {
            window.stateManager && window.stateManager.setQuizStatus && window.stateManager.setQuizStatus(itemId, {
                uiState: isCorrect ? 'correct' : 'incorrect',
                selectedIndex: selectedIndex,
                attempted: true,
                everWrong: !isCorrect,
                finished: isCorrect
            });
        } catch(e) {}
    // Store current question for context in modal
        this.currentQuestion = this.data.questions.find(q => q.id === quizId);
        
        // Track first attempt if not already answered
        if (!this.firstAttemptAnswers.has(quizId)) {
            this.firstAttemptAnswers.set(quizId, isCorrect);
        }
        
        // Update mastery set based on this attempt
        if (isCorrect) { this.correctlyAnswered.add(quizId); } else { this.correctlyAnswered.delete(quizId); }
        
        // Mark as answered
        this.answeredQuestions.add(quizId);
        
        // Disable all other options so learners cannot click around to find the correct answer
        optionsContainer.querySelectorAll('.check-option').forEach(button => {
            if (button !== selectedOption) {
                button.disabled = true;
                button.setAttribute('aria-disabled', 'true');
            } else {
                button.disabled = false;
                button.removeAttribute('aria-disabled');
            }
        });
        
        // Only mark the selected answer visually
        if (isCorrect) {
            // Correct answer - show green checkmark
            selectedOption.classList.remove('bg-white/20', 'hover:bg-white/30');
            selectedOption.classList.add('bg-green-500', 'text-white');
            // Use flexbox to align the checkmark after the answer text
            selectedOption.classList.add('flex', 'items-center');
            const checkmark = document.createElement('span');
            checkmark.className = 'answer-mark font-bold ml-2';
            // Inject our custom check icon rather than a plain character
            checkmark.innerHTML = ICONS.check;
            selectedOption.appendChild(checkmark);
        } else {
            // Incorrect answer - show red X (but DON'T reveal correct answer)
            selectedOption.classList.remove('bg-white/20', 'hover:bg-white/30');
            selectedOption.classList.add('bg-red-500', 'text-white');
            // Use flexbox to align the X mark after the answer text
            selectedOption.classList.add('flex', 'items-center');
            const xmark = document.createElement('span');
            xmark.className = 'answer-mark font-bold ml-2';
            // Inject our custom cross icon for incorrect answers
            xmark.innerHTML = ICONS.cross;
            selectedOption.appendChild(xmark);
            
            // Show retry button ONLY if incorrect
            let retryBtn = parentContainer.querySelector('.retry-button');
            if (!retryBtn) {
                retryBtn = document.createElement('button');
                retryBtn.className = 'retry-button mt-4 px-4 py-2 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors';
                retryBtn.textContent = 'Try Again';
                retryBtn.dataset.quizId = quizId;
                retryBtn.setAttribute('tabindex', '0');
                retryBtn.setAttribute('aria-label', 'Reset this question and try again');
                parentContainer.appendChild(retryBtn);
            }
            retryBtn.classList.remove('hidden');
        }
        
        // Show feedback
        const question = this.data.questions.find(q => q.id === quizId);
        let feedbackText = question ? question.feedback : 'Please review the correct answer.';
        
        // Handle feedback based on whether answer was correct
        if (isCorrect) {
            // For correct answers, show feedback as-is (already starts with "Correct!")
            setTimeout(() => {
                this.showModal(feedbackText);
                // Check if quiz is complete after modal is shown
                if (this.isQuizComplete()) {
                    const existingCompletion = document.querySelector('.bg-white.border-2.border-green-500');
                    if (!existingCompletion) {
                        setTimeout(() => this.showCompletion(), 300);
                    }
                }
            }, 500);
        } else {
            // For incorrect answers, strip "Correct!" and add "Not quite." prefix
            feedbackText = feedbackText.replace(/^Correct!\s*/i, '');
            const incorrectFeedback = `<span class="font-bold text-red-600">Not quite.</span> ${feedbackText}`;
            setTimeout(() => {
                this.showModal(incorrectFeedback);
                // Check if quiz is complete after modal is shown
                if (this.isQuizComplete()) {
                    const existingCompletion = document.querySelector('.bg-white.border-2.border-green-500');
                    if (!existingCompletion) {
                        setTimeout(() => this.showCompletion(), 300);
                    }
                }
            }, 500);


// Persist quiz status for this question
if (window.stateManager && typeof window.stateManager.setQuizStatus === 'function' && itemId) {
    const firstAttemptRecorded = this.firstAttemptAnswers.has(quizId);
    const firstAttemptValue = this.firstAttemptAnswers.get(quizId);
    window.stateManager.setQuizStatus(itemId, {
        uiState: isCorrect ? 'correct' : 'incorrect',
        selectedIndex: selectedIndex,
        firstAttemptRecorded,
        firstAttemptCorrect: firstAttemptValue === true
    });
}
        }
    }
    
    reviewAnswer(selectedOption, quizId) {
        const isCorrect = selectedOption.hasAttribute('data-correct');
        const question = this.data && this.data.questions
            ? this.data.questions.find(q => q.id === quizId)
            : null;
        if (!question) return;

        // Preserve first-attempt scoring and stored state; just re-show feedback
        this.currentQuestion = question;
        let feedbackText = question.feedback || 'Please review the correct answer.';

        if (isCorrect) {
            // Show the standard "Correct!" feedback again
            this.showModal(feedbackText);
        } else {
            // Mirror the "Not quite" treatment for incorrect options
            feedbackText = feedbackText.replace(/^Correct!\s*/i, '');
            const incorrectFeedback = `<span class=\"font-bold text-red-600\">Not quite.</span> ${feedbackText}`;
            this.showModal(incorrectFeedback);
        }
    }

    resetQuestion(quizId) {
        this.correctlyAnswered.delete(quizId);
        const parentContainer = this.container.querySelector(`[data-quiz-id="${quizId}"]`);
        if (!parentContainer) return;
        const itemId = (parentContainer.dataset && parentContainer.dataset.itemId) ? parentContainer.dataset.itemId : `quiz-q${quizId}`;
        const existingStatus = (window.stateManager && typeof window.stateManager.getQuizStatus === 'function' && itemId)
            ? (window.stateManager.getQuizStatus(itemId) || {})
            : {};
        
        // Remove from answered set
        this.answeredQuestions.delete(quizId);
        
        // Reset all options
        const optionsContainer = parentContainer.querySelector('.quiz-options');
        optionsContainer.querySelectorAll('.check-option').forEach(button => {
            button.disabled = false;
            button.removeAttribute('aria-disabled');
            button.classList.remove('bg-green-500', 'bg-red-500', 'text-white');
            button.classList.add('bg-white/20', 'hover:bg-white/30');
            
            // Remove answer marks
            const mark = button.querySelector('.answer-mark');
            if (mark) mark.remove();
        });
        
        // Hide and remove retry button
        const retryBtn = parentContainer.querySelector('.retry-button');
        if (retryBtn) {
            retryBtn.remove();
        }
        
        // Focus first option for accessibility
        const firstOption = optionsContainer.querySelector('.check-option');
        if (firstOption) {
            window.silentFocus(firstOption);
        }

// Persist reset state (keep first-attempt history, clear current UI state)
if (window.stateManager && typeof window.stateManager.setQuizStatus === 'function' && itemId) {
    window.stateManager.setQuizStatus(itemId, {
        ...existingStatus,
        uiState: 'unanswered',
        selectedIndex: null
    });
}
    }
    
    getScore() {
        const totalQuestions = this.data.questions.length;
        let correctCount = 0;
        this.data.questions.forEach(q => { if (this.firstAttemptAnswers.get(q.id) === true) { correctCount++; } });
        return { correct: correctCount, total: totalQuestions };
    }
    
    isQuizComplete() {
        return this.correctlyAnswered.size === this.data.questions.length;
    }
    
    showCompletion() {
        const score = this.getScore();
        const percentage = Math.round((score.correct / score.total) * 100);
        
        // Celebrate good scores!
        if (percentage >= 80) {
            this.launchConfetti();
        }
        
        const completionHTML = `
            <div class="bg-white border-2 border-green-500 rounded-xl p-8 text-center shadow-lg mt-8">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">${percentage === 100 ? '🎉 Perfect Score! 🎉' : 'Quiz Complete!'}</h3>
                <p class="text-xl text-gray-700 mb-6">Score: ${score.correct}/${score.total} (${percentage}%)</p>
                <button id="reset-all-btn" class="px-6 py-3 btn-brand rounded-lg">
                    ↻ Start Over
                </button>
            </div>
        `;
        
        // Append completion section
        this.container.insertAdjacentHTML('beforeend', completionHTML);
        
        // Add event listener for reset button
        document.getElementById('reset-all-btn').addEventListener('click', () => {
            this.confirmResetAll();
        });
    }
    
    launchConfetti() {
        const colors = ['#008CA8', '#00447C', '#10b981', '#f59e0b', '#ec4899'];
        const confettiCount = 150;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}vw;
                top: -20px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                pointer-events: none;
                z-index: 9999;
                animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }
        
        // Add animation if not exists
        if (!document.getElementById('confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) rotate(${Math.random() * 720}deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    confirmResetAll() { this.resetAll(); this.scrollToTopSmooth(); }

    
    
    
    // Helper: robustly scroll to top across browsers/containers
    scrollToTopSmooth() {
        const main = document.getElementById('main-content') || document.body;
        try { main.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e) {}
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
        // Fallbacks
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        // Extra raf for SPA re-render timing
        requestAnimationFrame(() => {
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
        });
    }
    resetAll() {
        // Clear all tracking
        this.answeredQuestions.clear();
        this.firstAttemptAnswers.clear();
        this.correctlyAnswered.clear();
        
        if (window.stateManager && typeof window.stateManager.clearAllQuizStatus === 'function') {
            window.stateManager.clearAllQuizStatus();
        }
        
        // Re-render quiz
        this.render();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    


restoreQuizStateFromStorage() {
    if (!window.stateManager || typeof window.stateManager.getQuizStatus !== 'function') return;
    if (!this.data || !this.data.questions || !this.container) return;

    // Reset tracking to align with stored state
    this.answeredQuestions = new Set();
    this.firstAttemptAnswers = new Map();
    this.correctlyAnswered = new Set();

    this.data.questions.forEach(question => {
        const quizId = question.id;
        const itemId = `quiz-q${question.id}`;
        const status = window.stateManager.getQuizStatus(itemId);
        if (!status) return;

        // Rebuild first-attempt info for scoring
        if (status.firstAttemptRecorded) {
            this.firstAttemptAnswers.set(quizId, status.firstAttemptCorrect === true);
        }

        // Rebuild answered/correct sets based on current UI state
        if (status.uiState === 'correct' || status.uiState === 'incorrect') {
            this.answeredQuestions.add(quizId);
        }
        if (status.uiState === 'correct') {
            this.correctlyAnswered.add(quizId);
        }

        const container = this.container.querySelector(`[data-quiz-id="${quizId}"]`);
        if (!container) return;

        const optionsContainer = container.querySelector('.quiz-options');
        if (!optionsContainer) return;

        const options = Array.from(optionsContainer.querySelectorAll('.check-option'));

        // Reset all options to base state
        options.forEach(button => {
            button.disabled = false;
            button.removeAttribute('aria-disabled');
            button.classList.remove('bg-green-500', 'bg-red-500', 'text-white', 'flex', 'items-center');
            const mark = button.querySelector('.answer-mark');
            if (mark) mark.remove();
            if (!button.classList.contains('bg-white/20')) {
                button.classList.add('bg-white/20');
            }
            if (!button.classList.contains('hover:bg-white/30')) {
                button.classList.add('hover:bg-white/30');
            }
        });

        const idx = typeof status.selectedIndex === 'number' ? status.selectedIndex : -1;
        if (idx >= 0 && idx < options.length && (status.uiState === 'correct' || status.uiState === 'incorrect')) {
            const selectedOption = options[idx];

            // Disable all other options as in handleAnswer
            options.forEach(button => {
                if (button !== selectedOption) {
                    button.disabled = true;
                    button.setAttribute('aria-disabled', 'true');
                } else {
                    button.disabled = false;
                    button.removeAttribute('aria-disabled');
                }
            });

            selectedOption.classList.remove('bg-white/20', 'hover:bg-white/30');
            selectedOption.classList.add('flex', 'items-center', 'text-white');

            const mark = document.createElement('span');
            mark.className = 'answer-mark font-bold ml-2';

            if (status.uiState === 'correct') {
                selectedOption.classList.add('bg-green-500');
                mark.innerHTML = ICONS.check;
            } else if (status.uiState === 'incorrect') {
                selectedOption.classList.add('bg-red-500');
                mark.innerHTML = ICONS.cross;

                // Ensure retry button is visible for incorrect answers
                let retryBtn = container.querySelector('.retry-button');
                if (!retryBtn) {
                    retryBtn = document.createElement('button');
                    retryBtn.className = 'retry-button mt-4 px-4 py-2 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors';
                    retryBtn.textContent = 'Try Again';
                    retryBtn.dataset.quizId = quizId;
                    retryBtn.setAttribute('tabindex', '0');
                    retryBtn.setAttribute('aria-label', 'Reset this question and try again');
                    container.appendChild(retryBtn);
                } else {
                    retryBtn.classList.remove('hidden');
                }
            }

            selectedOption.appendChild(mark);
        }
    });

    // If user had already completed the quiz, restore completion summary
    if (this.isQuizComplete()) {
        const existingCompletion = document.querySelector('.bg-white.border-2.border-green-500');
        if (!existingCompletion) {
            this.showCompletion();
        }
    }
}

    render() {
        const html = this.data.questions.map(question => {
            const itemId = `quiz-q${question.id}`;
            const isSaved = window.stateManager?.isSaved?.(itemId) || false;
            const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
            
            return `
            <div class="knowledge-check quiz-gradient text-white p-6 rounded-xl shadow-lg" data-quiz-id="${question.id}" data-item-id="${itemId}">
                <div class="flex items-start justify-between gap-2 mb-4">
                    <div class="font-bold flex-1">${question.number}. ${question.question}</div>
                    <button class="question-star-btn text-lg flex-shrink-0 hover:scale-110 transition-transform" 
                            data-item-id="${itemId}" 
                            data-question-num="${question.number}"
                            data-question-text="${this.escapeHtml(question.question)}"
                            title="${isSaved ? 'Unsave question' : 'Save question'}"
                            aria-label="${isSaved ? 'Unsave' : 'Save'} question ${question.number}">${starIcon}</button>
                    <button class="ml-1 text-lg flex-shrink-0 hover:scale-110 transition-transform"
                            data-note-btn="true"
                            data-note-id="${itemId}"
                            data-note-type="quiz"
                            data-note-label="${question.number}. ${this.escapeHtml(question.question)}"
                            data-note-source="Knowledge Checks"
                            title="Add note">
                        <span data-note-icon>${window.stateManager?.hasNote && window.stateManager.hasNote(itemId) ? (ICONS.noteFilled || '🖊') : (ICONS.noteOutline || '🖊')}</span>
                    </button>
                </div>
                <div class="quiz-options grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${question.options.map((option, index) => `
                        <button class="check-option bg-white/20 hover:bg-white/30 p-3 rounded-lg transition-all text-left" 
                                tabindex="0"
                                role="button"
                                aria-label="Option ${index + 1}: ${option.text}"
                                ${option.correct ? 'data-correct="true"' : ''}>
                            ${option.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        }).join('');
        
        this.container.innerHTML = html;
        this.attachStarListeners();
    }
    
    attachStarListeners() {
        const starButtons = this.container.querySelectorAll('.question-star-btn');
        starButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                const questionNum = btn.dataset.questionNum;
                const questionText = btn.dataset.questionText;
                
                if (window.stateManager) {
                    const isCurrentlySaved = window.stateManager.isSaved(itemId);
                    const context = {
                        type: 'knowledge-check',
                        title: `${questionNum}. ${questionText}`,
                        tab: 'knowledge-check'
                    };
                    window.stateManager.toggleSaved(itemId, context);
                    
                    // Update button UI
                    const isSaved = !isCurrentlySaved;
                    const starIcon = isSaved ? (window.ICONS?.starFilled || '★') : (window.ICONS?.starOutline || '☆');
                    btn.innerHTML = starIcon;
                    btn.setAttribute('title', isSaved ? 'Unsave question' : 'Save question');
                    btn.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} question ${questionNum}`);
                }
            });
        });
    }
    
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Make QuizManager available globally
window.QuizManager = QuizManager;


/* === Modal Keyboard Focus Trap (Knowledge Check) === */
(function(){
  const modal = document.getElementById('feedback-modal');
  if(!modal) return;

  let previouslyFocused = null;

  function isVisible(el){
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function getFocusable(){
    const selectors = [
      'a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
      'button:not([disabled])','iframe','object','embed','[contenteditable]','[tabindex]:not([tabindex="-1"])'
    ];
    return Array.from(modal.querySelectorAll(selectors.join(','))).filter(isVisible);
  }

  function focusFirst(){
    const f = getFocusable()[0];
    if (f) { if (window.silentFocus) { silentFocus(f); } else { try { f.focus(); } catch(e){} } }
  }

  function onKeydown(e){
    if (e.key !== 'Tab') return;
    const list = getFocusable();
    if (list.length === 0) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus(); return;
    }
    if (!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus(); return;
    }
  }

  function onFocusin(e){
    if (!modal.classList.contains('flex') || modal.classList.contains('hidden')) return;
    if (!modal.contains(e.target)){
      // redirect back into modal
      focusFirst();
    }
  }

  // Observe open/close (class changes) to set up/tear down trap
  const observer = new MutationObserver(()=>{
    const open = modal.classList.contains('flex') && !modal.classList.contains('hidden');
    if (open){
      previouslyFocused = document.activeElement;
      // Delay to ensure content is in DOM
      setTimeout(focusFirst, 0);
      document.addEventListener('keydown', onKeydown, true);
      document.addEventListener('focusin', onFocusin, true);
    } else {
      document.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('focusin', onFocusin, true);
      if (previouslyFocused && document.contains(previouslyFocused)){
        if (window.silentFocus) { silentFocus(previouslyFocused); } else { try { previouslyFocused.focus(); } catch(e){} }
      }
    }
  });

  observer.observe(modal, { attributes: true, attributeFilter: ['class', 'open', 'hidden', 'aria-hidden'] });
})();
/* === /Modal Keyboard Focus Trap === */
