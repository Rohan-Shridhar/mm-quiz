const $ = (selector) => document.querySelector(selector);
const weekGrid = $('#week-grid');
const countInput = $('#question-count');
const availableCount = $('#available-count');
const formError = $('#form-error');
const quizArea = $('#quiz-area');
const questionList = $('#question-list');
const completionCard = $('#completion-card');

let sessionQuestions = [];
let correctIds = new Set();
let questionIdCounter = 0;

function selectedWeeks() {
  return [...weekGrid.querySelectorAll('input:checked')].map(input => Number(input.value));
}
function availableQuestions() {
  const weeks = selectedWeeks();
  return QUESTION_BANK.filter(question => weeks.includes(question.week)).length;
}
function updateAvailability() {
  const available = availableQuestions();
  availableCount.textContent = `${available} question${available === 1 ? '' : 's'} available`;
  countInput.max = Math.max(1, available);
  if (Number(countInput.value) > available && available > 0) countInput.value = available;
  if (!available) availableCount.textContent = 'Select at least one week';
  formError.hidden = true;
}
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
}
function renderQuestion(question, index) {
  const card = document.createElement('article');
  card.className = 'question-card';
  card.id = `question-${question.id}`;
  card.dataset.questionId = question.id;
  const optionsHTML = question.options.map((option, optionIndex) => `
    <button type="button" class="option-button" data-option="${optionIndex}">
      <span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span>
      <span>${escapeHTML(option)}</span>
    </button>`).join('');
  card.innerHTML = `
    <div class="question-head">
      <span class="question-number">QUESTION ${String(index + 1).padStart(2, '0')}</span>
      <div class="week-control">
        <button class="week-reveal" type="button" aria-expanded="false">Show week</button>
        <span class="week-badge" hidden>Week ${question.week}</span>
      </div>
    </div>
    <h3 class="question-text">${escapeHTML(question.q)}</h3>
    <div class="options">${optionsHTML}</div>
    <div class="feedback" aria-live="polite"></div>
    <p class="attempt-note">Choose an option. If it's wrong, you can try again.</p>`;
  const weekButton = card.querySelector('.week-reveal');
  const weekBadge = card.querySelector('.week-badge');
  weekButton.addEventListener('click', () => {
    const show = weekBadge.hidden;
    weekBadge.hidden = !show;
    weekButton.textContent = show ? 'Hide week' : 'Show week';
    weekButton.setAttribute('aria-expanded', String(show));
  });
  const optionButtons = [...card.querySelectorAll('.option-button')];
  const feedback = card.querySelector('.feedback');
  const note = card.querySelector('.attempt-note');
  let solved = false;
  optionButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (solved) return;
      const selected = Number(button.dataset.option);
      if (selected === question.answer) {
        solved = true;
        correctIds.add(question.id);
        card.classList.add('correct-card');
        button.classList.add('right');
        optionButtons.forEach((optionButton, i) => {
          optionButton.disabled = true;
          if (i === question.answer) optionButton.classList.add('right');
        });
        feedback.className = 'feedback visible good';
        feedback.innerHTML = `<strong>✓ Correct — here's why</strong><p>${escapeHTML(question.explanation)}</p>`;
        note.textContent = 'Answered correctly';
        updateProgress();
      } else {
        button.classList.add('wrong');
        button.disabled = true;
        feedback.className = 'feedback visible try-again';
        feedback.innerHTML = '<strong>Not quite — try another option.</strong><p>That option isn’t correct. The remaining choices are still available.</p>';
        note.textContent = 'Incorrect choices are disabled; keep trying until you find the correct answer.';
      }
    });
  });
  return card;
}
function updateProgress() {
  const total = sessionQuestions.length;
  const solved = correctIds.size;
  const percent = total ? Math.round(solved / total * 100) : 0;
  $('#progress-label').textContent = `${solved} of ${total} answered correctly`;
  $('#score-label').textContent = `Progress: ${percent}%`;
  $('#progress-fill').style.width = `${percent}%`;
  if (solved === total && total > 0) {
    completionCard.hidden = false;
    $('#completion-title').textContent = percent === 100 ? 'Perfect run!' : 'Session complete!';
    $('#completion-copy').textContent = `You answered all ${total} questions correctly. Keep revising to make the concepts stick.`;
  }
}
function startQuiz() {
  const weeks = selectedWeeks();
  const count = Number(countInput.value);
  const pool = QUESTION_BANK.filter(question => weeks.includes(question.week));
  if (!weeks.length) {
    formError.textContent = 'Choose at least one week to start.';
    formError.hidden = false;
    return;
  }
  if (!Number.isInteger(count) || count < 1 || count > 80) {
    formError.textContent = 'Enter a whole number between 1 and 80.';
    formError.hidden = false;
    return;
  }
  if (count > pool.length) {
    formError.textContent = `Only ${pool.length} questions are available in the selected weeks. Select more weeks or reduce the question count.`;
    formError.hidden = false;
    return;
  }
  sessionQuestions = shuffle(pool).slice(0, count).map(question => ({...question, id: ++questionIdCounter}));
  correctIds = new Set();
  questionList.replaceChildren();
  sessionQuestions.forEach((question, index) => questionList.appendChild(renderQuestion(question, index)));
  completionCard.hidden = true;
  quizArea.hidden = false;
  updateProgress();
  quizArea.scrollIntoView({behavior:'smooth', block:'start'});
}
$('#start-quiz').addEventListener('click', startQuiz);
$('#select-all').addEventListener('click', () => {
  weekGrid.querySelectorAll('input').forEach(input => input.checked = true);
  updateAvailability();
});
$('#clear-all').addEventListener('click', () => {
  weekGrid.querySelectorAll('input').forEach(input => input.checked = false);
  updateAvailability();
});
weekGrid.addEventListener('change', updateAvailability);
countInput.addEventListener('input', () => {
  const value = Number(countInput.value);
  if (value > 80) countInput.value = 80;
  if (value < 1 && countInput.value !== '') countInput.value = 1;
  updateAvailability();
});
$('#minus-count').addEventListener('click', () => {
  countInput.value = Math.max(1, (Number(countInput.value) || 1) - 1);
  updateAvailability();
});
$('#plus-count').addEventListener('click', () => {
  countInput.value = Math.min(80, (Number(countInput.value) || 1) + 1);
  updateAvailability();
});
function backToSetup() {
  quizArea.hidden = true;
  $('.setup-card').scrollIntoView({behavior:'smooth', block:'start'});
}
$('#restart-setup').addEventListener('click', backToSetup);
$('#try-again').addEventListener('click', backToSetup);
updateAvailability();
