(() => {
  'use strict';

  const ANIMALS = ['🐠', '🐡', '🐙', '🐢', '🦀', '🐬', '🦑', '🐳', '🦐', '🦞'];
  const HANGUL_NAMES = {
    1: ['일', '하나'],
    2: ['이', '둘'],
    3: ['삼', '셋'],
    4: ['사', '넷'],
    5: ['오', '다섯'],
    6: ['육', '여섯'],
    7: ['칠', '일곱'],
    8: ['팔', '여덟'],
    9: ['구', '아홉'],
    10: ['십', '열']
  };
  const MODE_INFO = {
    add: { label: '더하기', icon: '➕' },
    sub: { label: '빼기', icon: '➖' },
    mix: { label: '섞어서', icon: '🌈' }
  };

  const homeScreen = document.getElementById('homeScreen');
  const gameScreen = document.getElementById('gameScreen');
  const endScreen = document.getElementById('endScreen');
  const homeBtn = document.getElementById('homeBtn');
  const soundBtn = document.getElementById('soundBtn');
  const repeatBtn = document.getElementById('repeatBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const scoreText = document.getElementById('scoreText');
  const modePill = document.getElementById('modePill');
  const questionCard = document.getElementById('questionCard');
  const questionText = document.getElementById('questionText');
  const questionHelp = document.getElementById('questionHelp');
  const visualRow = document.getElementById('visualRow');
  const answers = document.getElementById('answers');
  const feedback = document.getElementById('feedback');
  const starRating = document.getElementById('starRating');
  const endTitle = document.getElementById('endTitle');
  const endScore = document.getElementById('endScore');
  const againBtn = document.getElementById('againBtn');
  const chooseBtn = document.getElementById('chooseBtn');
  const fxLayer = document.getElementById('fxLayer');
  const bubblesLayer = document.getElementById('bubbles');

  const state = {
    mode: 'add',
    total: 10,
    index: 0,
    score: 0,
    current: null,
    locked: true,
    playing: false,
    mixStart: 'add',
    hangulOrder: [],
    usedKeys: new Set(),
    timers: []
  };

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function readMuted() {
    try {
      return localStorage.getItem('seaNumbersMuted') === '1';
    } catch (error) {
      return false;
    }
  }

  function saveMuted(value) {
    try {
      localStorage.setItem('seaNumbersMuted', value ? '1' : '0');
    } catch (error) {
      return;
    }
  }

  class SoundKit {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.voices = [];
      this.speechTimer = null;
      this.muted = readMuted();
      this.loadVoices();
    }

    loadVoices() {
      if (!('speechSynthesis' in window)) return;
      const refresh = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
      refresh();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', refresh);
      }
    }

    unlock() {
      if (!this.ctx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        this.ctx = new AudioCtor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.62;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    tone(freq, delay = 0, duration = 0.18, type = 'sine', volume = 0.16, endFreq = null) {
      if (!this.ctx || this.muted) return;
      const start = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + duration + 0.04);
    }

    pop() {
      this.tone(540, 0, 0.08, 'sine', 0.11, 900);
      this.tone(920, 0.04, 0.1, 'sine', 0.06, 430);
    }

    question() {
      const notes = [659.25, 783.99, 987.77];
      notes.forEach((note, index) => {
        this.tone(note, index * 0.085, 0.18, 'triangle', 0.095);
      });
      this.tone(1180, 0.26, 0.12, 'sine', 0.05, 1560);
    }

    correct() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((note, index) => {
        this.tone(note, index * 0.075, 0.18, 'triangle', 0.12);
      });
      this.tone(1318.51, 0.31, 0.34, 'sine', 0.085);
      this.tone(1567.98, 0.38, 0.3, 'sine', 0.06);
    }

    wrong() {
      this.tone(392, 0, 0.16, 'sine', 0.1, 329.63);
      this.tone(329.63, 0.15, 0.26, 'sine', 0.085, 261.63);
      this.tone(620, 0, 0.08, 'sine', 0.035, 340);
    }

    celebrate() {
      const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51];
      melody.forEach((note, index) => {
        this.tone(note, index * 0.11, 0.26, 'triangle', 0.11);
      });
      this.tone(1567.98, 0.8, 0.5, 'sine', 0.075);
      this.tone(2093, 0.9, 0.45, 'sine', 0.04);
    }

    cancelSpeech() {
      if (this.speechTimer) {
        clearTimeout(this.speechTimer);
        this.speechTimer = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }

    speak(text, delay = 0) {
      if (this.muted) return;
      this.cancelSpeech();
      if (!('speechSynthesis' in window)) return;
      const run = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1.12;
        utterance.volume = 1;
        const koreanVoice = this.voices.find((voice) => /^ko/i.test(voice.lang));
        if (koreanVoice) utterance.voice = koreanVoice;
        window.speechSynthesis.speak(utterance);
      };
      if (delay > 0) {
        this.speechTimer = setTimeout(() => {
          this.speechTimer = null;
          run();
        }, delay);
      } else {
        run();
      }
    }
  }

  const sound = new SoundKit();

  function syncSoundButton() {
    soundBtn.textContent = sound.muted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-label', sound.muted ? '소리 켜기' : '소리 끄기');
    soundBtn.setAttribute('aria-pressed', String(!sound.muted));
  }

  function showScreen(name) {
    const map = { home: homeScreen, game: gameScreen, end: endScreen };
    Object.entries(map).forEach(([key, screen]) => {
      screen.classList.toggle('is-active', key === name);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function clearGameTimers() {
    state.timers.forEach((timer) => clearTimeout(timer));
    state.timers = [];
    sound.cancelSpeech();
  }

  function later(callback, delay) {
    const timer = setTimeout(() => {
      state.timers = state.timers.filter((item) => item !== timer);
      callback();
    }, delay);
    state.timers.push(timer);
  }

  function generateQuestion(mode, index) {
    if (mode === 'hangul') {
      const number = state.hangulOrder[index] || randomInt(1, 10);
      const [sino, native] = HANGUL_NAMES[number];
      return {
        type: 'hangul',
        number,
        sino,
        native,
        answer: number,
        key: `hangul-${number}`,
        animal: ANIMALS[randomInt(0, ANIMALS.length - 1)],
        options: makeOptions(number, 1, 10)
      };
    }

    let op = mode;
    if (mode === 'mix') {
      const second = state.mixStart === 'add' ? 'sub' : 'add';
      op = index % 2 === 0 ? state.mixStart : second;
    }

    const easy = index < 3;
    let a = 1;
    let b = 1;
    let answer = 2;
    let key = '';
    let tries = 0;

    do {
      if (op === 'add') {
        if (easy) {
          a = randomInt(1, 4);
          b = randomInt(1, 5 - a);
        } else {
          a = randomInt(1, 9);
          b = randomInt(1, 10 - a);
        }
        answer = a + b;
      } else {
        if (easy) {
          a = randomInt(3, 5);
          b = randomInt(1, a - 1);
        } else {
          a = randomInt(5, 10);
          b = randomInt(1, a - 1);
        }
        answer = a - b;
      }
      key = `${op}-${a}-${b}`;
      tries += 1;
    } while (state.usedKeys.has(key) && tries < 40);

    state.usedKeys.add(key);

    return {
      op,
      a,
      b,
      answer,
      key,
      animal: ANIMALS[randomInt(0, ANIMALS.length - 1)],
      options: makeOptions(answer)
    };
  }

  function makeOptions(answer, min = 0, max = 10) {
    const options = new Set([answer]);
    const deltas = shuffle([1, -1, 2, -2, 3, -3, 4, -4]);
    for (const delta of deltas) {
      const value = answer + delta;
      if (value >= min && value <= max && !options.has(value)) {
        options.add(value);
      }
      if (options.size === 4) break;
    }
    while (options.size < 4) {
      options.add(randomInt(min, max));
    }
    return shuffle(Array.from(options));
  }

  function copula(word) {
    const code = word.charCodeAt(word.length - 1);
    if (code < 0xac00 || code > 0xd7a3) return '예요';
    return (code - 0xac00) % 28 === 0 ? '예요' : '이에요';
  }

  function questionSpeech(question) {
    if (question.type === 'hangul') {
      return '이 숫자와 짝이 되는 한글을 찾아보세요.';
    }
    if (question.op === 'add') {
      return `${question.a} 더하기 ${question.b}. 모두 몇 마리일까요?`;
    }
    return `${question.a} 빼기 ${question.b}. 몇 마리 남았을까요?`;
  }

  function equationSpeech(question) {
    if (question.op === 'add') {
      return `${question.a} 더하기 ${question.b}는 ${question.answer}`;
    }
    return `${question.a} 빼기 ${question.b}는 ${question.answer}`;
  }

  function updateProgress(answered = false) {
    progressText.textContent = `문제 ${state.index + 1} / ${state.total}`;
    scoreText.textContent = `⭐ ${state.score}`;
    const completed = state.index + (answered ? 1 : 0);
    progressFill.style.width = `${(completed / state.total) * 100}%`;
  }

  function makeFishGroup(count, goneCount, animal) {
    let fish = '';
    for (let i = 0; i < count; i += 1) {
      const gone = i >= count - goneCount;
      fish += `<span class="fish${gone ? ' is-gone' : ''}">${animal}</span>`;
    }
    return `<div class="fish-group">${fish}</div>`;
  }

  function renderQuestion(question) {
    const isHangul = question.type === 'hangul';

    questionCard.classList.toggle('question-card--hangul', isHangul);
    questionText.classList.toggle('is-hangul', isHangul);
    questionHelp.classList.toggle('is-visible', isHangul);
    modePill.classList.remove('mode-pill--add', 'mode-pill--sub', 'mode-pill--hangul');

    if (isHangul) {
      modePill.textContent = '가 한글 놀이';
      modePill.classList.add('mode-pill--hangul');
      questionText.innerHTML = `<span class="hangul-numeral">${question.number}</span>`;
      visualRow.className = 'visual-row visual-row--hangul';
      visualRow.innerHTML = makeFishGroup(question.number, 0, question.animal);
      visualRow.setAttribute('aria-label', `${question.number}마리`);
    } else {
      const isAdd = question.op === 'add';
      const info = MODE_INFO[isAdd ? 'add' : 'sub'];

      modePill.textContent = `${info.icon} ${info.label}`;
      modePill.classList.add(isAdd ? 'mode-pill--add' : 'mode-pill--sub');
      questionText.innerHTML = `${question.a} <span class="op op--${isAdd ? 'plus' : 'minus'}">${isAdd ? '+' : '−'}</span> ${question.b} <span class="eq">=</span> <span class="qmark">?</span>`;

      visualRow.className = 'visual-row';
      if (isAdd) {
        visualRow.classList.add('visual-row--add');
        visualRow.innerHTML = `${makeFishGroup(question.a, 0, question.animal)}<span class="op-sign" aria-hidden="true">+</span>${makeFishGroup(question.b, 0, question.animal)}`;
        visualRow.setAttribute('aria-label', `${question.a}마리와 ${question.b}마리, 모두 몇 마리일까요?`);
      } else {
        visualRow.classList.add('visual-row--sub');
        visualRow.innerHTML = makeFishGroup(question.a, question.b, question.animal);
        visualRow.setAttribute('aria-label', `${question.a}마리 중 ${question.b}마리가 사라졌어요. 몇 마리 남았을까요?`);
      }
    }

    answers.innerHTML = '';
    question.options.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-btn';
      button.dataset.value = String(value);

      if (isHangul) {
        const [sino, native] = HANGUL_NAMES[value];
        button.classList.add('answer-btn--hangul');
        button.innerHTML = `<span class="hangul-pair">${sino}<span class="pair-sep" aria-hidden="true">,</span> ${native}</span>`;
        button.setAttribute('aria-label', `${sino}, ${native}`);
      } else {
        button.textContent = String(value);
        button.setAttribute('aria-label', `${value}`);
      }

      button.addEventListener('click', (event) => handleAnswer(value, button, event));
      answers.appendChild(button);
    });

    feedback.textContent = '';
    feedback.className = 'feedback';
    questionCard.classList.remove('is-happy');
  }

  function setFeedback(text, kind) {
    feedback.textContent = text;
    feedback.className = `feedback is-visible ${kind}`;
  }

  function loadQuestion() {
    state.locked = false;
    state.current = generateQuestion(state.mode, state.index);
    renderQuestion(state.current);
    updateProgress(false);
    sound.question();
    sound.speak(questionSpeech(state.current), 520);
  }

  function startGame(mode) {
    sound.unlock();
    sound.pop();
    clearGameTimers();
    state.mode = mode;
    state.index = 0;
    state.score = 0;
    state.current = null;
    state.locked = false;
    state.playing = true;
    state.mixStart = Math.random() < 0.5 ? 'add' : 'sub';
    state.hangulOrder = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    state.usedKeys = new Set();
    scoreText.classList.remove('bump');
    updateProgress(false);
    showScreen('game');
    loadQuestion();
  }

  function handleAnswer(value, button, event) {
    if (state.locked || !state.current) return;
    state.locked = true;

    const question = state.current;
    const isCorrect = value === question.answer;

    Array.from(answers.children).forEach((option) => {
      option.disabled = true;
      const optionValue = Number(option.dataset.value);
      if (optionValue === question.answer) {
        option.classList.add('is-correct');
      } else if (option === button) {
        option.classList.add('is-wrong');
      } else {
        option.classList.add('is-dim');
      }
    });

    sound.cancelSpeech();

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (isCorrect) {
      state.score += 1;
      button.classList.add('is-correct');
      questionCard.classList.add('is-happy');
      sound.correct();
      spawnBurst(centerX, centerY, 20);
      if (question.type === 'hangul') {
        setFeedback(`정답이에요! ${question.sino}, ${question.native}`, 'ok');
        sound.speak(`정답이에요! ${question.sino}, ${question.native}!`, 280);
      } else {
        setFeedback('정답이에요! ⭐', 'ok');
        sound.speak(`정답이에요! ${equationSpeech(question)}!`, 280);
      }
      scoreText.classList.remove('bump');
      void scoreText.offsetWidth;
      scoreText.classList.add('bump');
    } else {
      button.classList.remove('is-correct');
      button.classList.add('is-wrong');
      sound.wrong();
      spawnBurst(centerX, centerY, 9, ['🫧', '💧', '✨']);
      if (question.type === 'hangul') {
        setFeedback(`정답은 ${question.sino}, ${question.native}${copula(question.native)}`, 'try');
        sound.speak(`아쉬워요. ${question.sino}, ${question.native}${copula(question.native)}. 괜찮아요!`, 320);
      } else {
        setFeedback(`정답은 ${question.answer}예요. 괜찮아요!`, 'try');
        sound.speak(`아쉬워요. 정답은 ${question.answer}예요. 괜찮아요!`, 320);
      }
    }

    updateProgress(true);

    later(() => {
      if (state.index + 1 >= state.total) {
        finishGame();
      } else {
        state.index += 1;
        loadQuestion();
      }
    }, isCorrect ? 2000 : 3200);
  }

  function finishGame() {
    state.playing = false;
    state.locked = true;
    clearGameTimers();
    progressFill.style.width = '100%';
    showScreen('end');

    const stars = state.score >= 9 ? 3 : state.score >= 6 ? 2 : 1;
    let title;
    if (state.mode === 'hangul') {
      title = state.score >= 9 ? '한글 숫자 박사!' : state.score >= 6 ? '한글 이름 척척!' : state.score >= 3 ? '한글 놀이 재밌어요!' : '끝까지 해냈어요!';
    } else {
      title = state.score >= 9 ? '바다의 숫자 왕!' : state.score >= 6 ? '정말 잘했어요!' : state.score >= 3 ? '잘하고 있어요!' : '끝까지 해냈어요!';
    }

    endTitle.textContent = title;
    endScore.textContent = `${state.total}문제 중 ${state.score}개를 맞혔어요!`;
    starRating.innerHTML = '';
    for (let i = 0; i < 3; i += 1) {
      const star = document.createElement('span');
      star.className = i < stars ? 'star lit' : 'star';
      star.textContent = '⭐';
      starRating.appendChild(star);
    }
    starRating.setAttribute('aria-label', `별 세 개 중 ${stars}개`);

    sound.celebrate();
    sound.speak(`와! ${state.total}문제를 모두 했어요. ${state.score}개를 맞혔어요. ${title}`, 700);
    spawnConfetti();
  }

  function spawnBurst(x, y, count, palette) {
    const emojis = palette || ['⭐', '✨', '💫', '🌟', '🫧'];
    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      spark.textContent = emojis[randomInt(0, emojis.length - 1)];
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--size', `${randomInt(15, 30)}px`);
      const angle = Math.random() * Math.PI * 2;
      const distance = 46 + Math.random() * 116;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance - 44}px`);
      spark.style.setProperty('--rot', `${randomInt(-210, 210)}deg`);
      spark.style.setProperty('--dur', `${(0.65 + Math.random() * 0.65).toFixed(2)}s`);
      fxLayer.appendChild(spark);
      setTimeout(() => spark.remove(), 1600);
    }
  }

  function spawnConfetti() {
    const emojis = ['⭐', '✨', '💫', '🌟', '🫧', '🐠', '🐚', '🎉'];
    for (let i = 0; i < 38; i += 1) {
      setTimeout(() => {
        const confetti = document.createElement('span');
        confetti.className = 'confetti';
        confetti.textContent = emojis[randomInt(0, emojis.length - 1)];
        confetti.style.left = `${Math.random() * 96}vw`;
        confetti.style.setProperty('--size', `${randomInt(16, 32)}px`);
        confetti.style.setProperty('--dur', `${(2.4 + Math.random() * 2).toFixed(2)}s`);
        confetti.style.setProperty('--drift', `${randomInt(-90, 90)}px`);
        confetti.style.animationDelay = `${(Math.random() * 0.4).toFixed(2)}s`;
        fxLayer.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5600);
      }, i * 65);
    }
  }

  function makeBubbles() {
    for (let i = 0; i < 22; i += 1) {
      const bubble = document.createElement('span');
      const size = randomInt(9, 46);
      bubble.className = 'bubble';
      bubble.style.setProperty('--size', `${size}px`);
      bubble.style.setProperty('--left', `${Math.random() * 100}%`);
      bubble.style.setProperty('--dur', `${(13 + Math.random() * 18).toFixed(2)}s`);
      bubble.style.setProperty('--delay', `${(-Math.random() * 30).toFixed(2)}s`);
      bubble.style.setProperty('--drift', `${randomInt(-110, 110)}px`);
      bubblesLayer.appendChild(bubble);
    }
  }

  function goHome() {
    sound.unlock();
    sound.pop();
    clearGameTimers();
    state.playing = false;
    state.locked = true;
    state.current = null;
    showScreen('home');
  }

  document.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => startGame(card.dataset.mode));
  });

  homeBtn.addEventListener('click', goHome);

  chooseBtn.addEventListener('click', goHome);

  againBtn.addEventListener('click', () => {
    startGame(state.mode);
  });

  repeatBtn.addEventListener('click', () => {
    if (!state.current || state.locked) return;
    sound.unlock();
    sound.pop();
    sound.question();
    sound.speak(questionSpeech(state.current), 480);
  });

  soundBtn.addEventListener('click', () => {
    sound.unlock();
    sound.muted = !sound.muted;
    saveMuted(sound.muted);
    sound.cancelSpeech();
    syncSoundButton();
    if (!sound.muted) {
      sound.pop();
      if (state.playing && state.current && !state.locked) {
        sound.speak(questionSpeech(state.current), 220);
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!gameScreen.classList.contains('is-active') || state.locked) return;
    const number = Number(event.key);
    if (number >= 1 && number <= 4) {
      const button = answers.children[number - 1];
      if (button) button.click();
    }
  });

  syncSoundButton();
  makeBubbles();
})();
