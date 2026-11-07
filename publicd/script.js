async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function showMessage(id, message, error = false) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = message;
        element.style.color = error ? "#d95163" : "#19a979";
    }
}

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function dateFormat(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? safe(value)
        : date.toLocaleString();
}

async function loadSummary() {
    const total = document.getElementById("totalQuizzes");

    if (!total) return;

    try {
        const data = await api("/api/summary");

        document.getElementById("totalQuizzes").textContent = data.totalQuizzes;
        document.getElementById("totalQuestions").textContent = data.totalQuestions;
        document.getElementById("totalAttempts").textContent = data.totalAttempts;
    } catch (error) {
        console.error(error.message);
    }
}

async function loadQuizOptions() {
    const select = document.getElementById("questionQuiz") ||
                   document.getElementById("examQuizSelect");

    if (!select) return;

    try {
        const quizzes = await api("/api/quizzes");

        select.innerHTML = '<option value="">Select a quiz</option>' +
            quizzes.map(quiz => `
                <option value="${quiz.quiz_id}">
                    ${safe(quiz.title)} - ${safe(quiz.subject)}
                </option>
            `).join("");
    } catch (error) {
        showMessage("questionMessage", error.message, true);
    }
}

/* REGISTER AND LOGIN */

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(registerForm));

        try {
            const result = await api("/api/register", {
                method: "POST",
                body: JSON.stringify(data)
            });

            registerForm.reset();

            showMessage(
                "registerMessage",
                result.message + ". Your user ID is " + result.user_id
            );
        } catch (error) {
            showMessage("registerMessage", error.message, true);
        }
    });
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(loginForm));

        try {
            const user = await api("/api/login", {
                method: "POST",
                body: JSON.stringify(data)
            });

            localStorage.setItem("bhavanaUser", JSON.stringify(user));

            document.getElementById("accountArea").textContent =
                "Logged in: " + user.name + " (" + user.role + ")";

            loginForm.reset();
            showMessage("loginMessage", "Login successful.");
        } catch (error) {
            showMessage("loginMessage", error.message, true);
        }
    });
}

const savedUser = localStorage.getItem("bhavanaUser");
const accountArea = document.getElementById("accountArea");

if (savedUser && accountArea) {
    try {
        const user = JSON.parse(savedUser);

        accountArea.textContent =
            "Logged in: " + user.name + " (" + user.role + ")";
    } catch (error) {
        localStorage.removeItem("bhavanaUser");
    }
}

/* CREATE QUIZ */

const quizForm = document.getElementById("quizForm");

if (quizForm) {
    quizForm.addEventListener("submit", async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(quizForm));
        const user = JSON.parse(localStorage.getItem("bhavanaUser") || "null");

        if (!user || user.role !== "teacher") {
            showMessage(
                "quizMessage",
                "Please login with a teacher account first.",
                true
            );
            return;
        }

        data.total_marks = Number(data.total_marks);
        data.duration = Number(data.duration);
        data.created_by = user.user_id;

        try {
            const result = await api("/api/quizzes", {
                method: "POST",
                body: JSON.stringify(data)
            });

            quizForm.reset();

            showMessage(
                "quizMessage",
                result.message + ". Quiz ID: " + result.quiz_id
            );

            loadQuizOptions();
        } catch (error) {
            showMessage("quizMessage", error.message, true);
        }
    });
}

/* ADD QUESTION */

const questionForm = document.getElementById("questionForm");

if (questionForm) {
    questionForm.addEventListener("submit", async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(questionForm));

        try {
            const result = await api("/api/questions", {
                method: "POST",
                body: JSON.stringify(data)
            });

            questionForm.reset();
            showMessage("questionMessage", result.message);
        } catch (error) {
            showMessage("questionMessage", error.message, true);
        }
    });
}

/* DELETE QUIZ */

const deleteQuizForm = document.getElementById("deleteQuizForm");

if (deleteQuizForm) {
    deleteQuizForm.addEventListener("submit", async event => {
        event.preventDefault();

        const id = new FormData(deleteQuizForm).get("quiz_id");

        if (!confirm("Delete this quiz and its questions and results?")) return;

        try {
            const result = await api("/api/quizzes/" + id, {
                method: "DELETE"
            });

            deleteQuizForm.reset();
            showMessage("deleteQuizMessage", result.message);
        } catch (error) {
            showMessage("deleteQuizMessage", error.message, true);
        }
    });
}

/* DELETE QUESTION */

const deleteQuestionForm = document.getElementById("deleteQuestionForm");

if (deleteQuestionForm) {
    deleteQuestionForm.addEventListener("submit", async event => {
        event.preventDefault();

        const id = new FormData(deleteQuestionForm).get("question_id");

        if (!confirm("Delete this question?")) return;

        try {
            const result = await api("/api/questions/" + id, {
                method: "DELETE"
            });

            deleteQuestionForm.reset();
            showMessage("deleteQuestionMessage", result.message);
        } catch (error) {
            showMessage("deleteQuestionMessage", error.message, true);
        }
    });
}

/* QUIZ LIST */

async function loadQuizList() {
    const table = document.getElementById("quizTable");

    if (!table) return;

    try {
        const quizzes = await api("/api/quizzes");

        const search = (
            document.getElementById("quizSearch")?.value || ""
        ).toLowerCase();

        const filtered = quizzes.filter(quiz =>
            [quiz.quiz_id, quiz.title, quiz.subject]
                .join(" ")
                .toLowerCase()
                .includes(search)
        );

        table.innerHTML = filtered.length
            ? filtered.map(quiz => `
                <tr>
                    <td>${quiz.quiz_id}</td>
                    <td><strong>${safe(quiz.title)}</strong></td>
                    <td>${safe(quiz.subject)}</td>
                    <td>${quiz.total_marks}</td>
                    <td>${quiz.duration} min</td>
                    <td>${quiz.question_count}</td>
                </tr>
            `).join("")
            : '<tr><td colspan="6">No quizzes found.</td></tr>';
    } catch (error) {
        table.innerHTML =
            `<tr><td colspan="6">${safe(error.message)}</td></tr>`;
    }
}

const quizSearch = document.getElementById("quizSearch");

if (quizSearch) {
    quizSearch.addEventListener("input", loadQuizList);
}

/* RESULTS LIST */

async function loadResults() {
    const table = document.getElementById("resultsTable");

    if (!table) return;

    try {
        const results = await api("/api/allresults");

        table.innerHTML = results.length
            ? results.map(result => `
                <tr>
                    <td>${result.result_id}</td>
                    <td>${safe(result.name)}</td>
                    <td>${safe(result.title)}</td>
                    <td>${result.score} / ${result.total_marks}</td>
                    <td>${dateFormat(result.attempted_date)}</td>
                    <td>${safe(result.status)}</td>
                </tr>
            `).join("")
            : '<tr><td colspan="6">No student results available.</td></tr>';
    } catch (error) {
        table.innerHTML =
            `<tr><td colspan="6">${safe(error.message)}</td></tr>`;
    }
}

/* FIND ONE QUIZ */

const findQuizForm = document.getElementById("findQuizForm");

if (findQuizForm) {
    findQuizForm.addEventListener("submit", async event => {
        event.preventDefault();

        const id = new FormData(findQuizForm).get("quiz_id");
        const details = document.getElementById("quizDetails");

        try {
            const quiz = await api("/api/quizzes/" + id);
            const questions = await api("/api/managequestions/" + id);

            details.innerHTML = `
                <h3>${safe(quiz.title)}</h3>
                <p><strong>Quiz ID:</strong> ${quiz.quiz_id}</p>
                <p><strong>Subject:</strong> ${safe(quiz.subject)}</p>
                <p><strong>Total Marks:</strong> ${quiz.total_marks}</p>
                <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
                <h3>Questions (${questions.length})</h3>

                ${questions.map((q, index) => `
                    <div class="found-question">
                        <strong>${index + 1}. ${safe(q.question_text)}</strong>
                        <p>A. ${safe(q.option_a)}</p>
                        <p>B. ${safe(q.option_b)}</p>
                        <p>C. ${safe(q.option_c)}</p>
                        <p>D. ${safe(q.option_d)}</p>
                    </div>
                `).join("")}
            `;

            details.classList.remove("hidden");
            showMessage("findQuizMessage", "Quiz found successfully.");
        } catch (error) {
            details.classList.add("hidden");
            showMessage("findQuizMessage", error.message, true);
        }
    });
}

/* EXAM */

let examQuestions = [];
let currentQuestion = 0;
let answers = {};
let bookmarks = [];
let examQuiz = null;
let examUserId = null;
let remainingSeconds = 0;
let timerInterval = null;

const startExamForm = document.getElementById("startExamForm");

if (startExamForm) {
    startExamForm.addEventListener("submit", async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(startExamForm));

        try {
            examQuiz = await api("/api/quizzes/" + data.quiz_id);
            examQuestions = await api("/api/questions/" + data.quiz_id);

            if (examQuestions.length === 0) {
                showMessage(
                    "examStartMessage",
                    "This quiz has no questions.",
                    true
                );
                return;
            }

            examUserId = Number(data.user_id);
            currentQuestion = 0;
            answers = {};
            bookmarks = [];
            remainingSeconds = Number(examQuiz.duration) * 60;

            document.getElementById("examTitle").textContent = examQuiz.title;
            document.getElementById("examSubject").textContent = examQuiz.subject;
            document.getElementById("examArea").classList.remove("hidden");
            document.getElementById("examResult").classList.add("hidden");

            displayQuestion();
            startTimer();
        } catch (error) {
            showMessage("examStartMessage", error.message, true);
        }
    });
}

function displayQuestion() {
    const question = examQuestions[currentQuestion];

    document.getElementById("questionNumber").textContent =
        "Question: " + (currentQuestion + 1);

    document.getElementById("questionText").textContent =
        question.question_text;

    document.getElementById("pageCount").textContent =
        (currentQuestion + 1) + " / " + examQuestions.length;

    document.getElementById("bookmarkButton").textContent =
        bookmarks.includes(question.question_id) ? "★" : "☆";

    const options = [
        ["A", question.option_a],
        ["B", question.option_b],
        ["C", question.option_c],
        ["D", question.option_d]
    ];

    const area = document.getElementById("optionsArea");
    area.innerHTML = "";

    options.forEach(option => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "option" +
            (answers[question.question_id] === option[0] ? " selected" : "");

        button.innerHTML = `
            <span class="option-letter">${option[0]}</span>
            <span class="option-text">${safe(option[1])}</span>
        `;

        button.addEventListener("click", () => {
            answers[question.question_id] = option[0];
            displayQuestion();
        });

        area.appendChild(button);
    });

    updateProgress();
    displayQuestionNumbers();
}

function updateProgress() {
    const completed = Object.keys(answers).length;
    const total = examQuestions.length;
    const percent = Math.round(completed / total * 100);

    document.getElementById("completedText").textContent =
        `Completed (${completed}/${total})`;

    document.getElementById("progressPercent").textContent =
        percent + "%";

    document.getElementById("progressBar").style.width =
        percent + "%";
}

function displayQuestionNumbers() {
    const area = document.getElementById("questionNumbers");
    area.innerHTML = "";

    examQuestions.forEach((question, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "question-number";
        button.textContent = index + 1;

        if (index === currentQuestion) {
            button.classList.add("current");
        }

        if (answers[question.question_id]) {
            button.classList.add("answered");
        }

        if (bookmarks.includes(question.question_id)) {
            button.classList.add("bookmarked");
        }

        button.addEventListener("click", () => {
            currentQuestion = index;
            displayQuestion();
        });

        area.appendChild(button);
    });
}

function goFirst() {
    currentQuestion = 0;
    displayQuestion();
}

function goPrevious() {
    if (currentQuestion > 0) {
        currentQuestion--;
        displayQuestion();
    }
}

function goNext() {
    if (currentQuestion < examQuestions.length - 1) {
        currentQuestion++;
        displayQuestion();
    }
}

function goLast() {
    currentQuestion = examQuestions.length - 1;
    displayQuestion();
}

const bookmarkButton = document.getElementById("bookmarkButton");

if (bookmarkButton) {
    bookmarkButton.addEventListener("click", () => {
        const id = examQuestions[currentQuestion].question_id;

        if (bookmarks.includes(id)) {
            bookmarks = bookmarks.filter(item => item !== id);
        } else {
            bookmarks.push(id);
        }

        displayQuestion();
    });
}

function showBookmarked() {
    const index = examQuestions.findIndex(question =>
        bookmarks.includes(question.question_id)
    );

    if (index === -1) {
        alert("No bookmarked questions.");
        return;
    }

    currentQuestion = index;
    displayQuestion();
}

function showAnswered() {
    const index = examQuestions.findIndex(question =>
        answers[question.question_id]
    );

    if (index === -1) {
        alert("No answered questions.");
        return;
    }

    currentQuestion = index;
    displayQuestion();
}

function startTimer() {
    clearInterval(timerInterval);
    updateTimer();

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimer();

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            submitExam(true);
        }
    }, 1000);
}

function updateTimer() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    document.getElementById("timerDisplay").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
}

const submitExamButton = document.getElementById("submitExamButton");

if (submitExamButton) {
    submitExamButton.addEventListener("click", () => submitExam(false));
}

async function submitExam(autoSubmit = false) {
    if (!autoSubmit && !confirm("Are you sure you want to submit your exam?")) {
        return;
    }

    clearInterval(timerInterval);

    try {
        const result = await api("/api/submitquiz", {
            method: "POST",
            body: JSON.stringify({
                quiz_id: examQuiz.quiz_id,
                user_id: examUserId,
                answers: answers
            })
        });

        document.getElementById("examArea").classList.add("hidden");
        document.getElementById("examResult").classList.remove("hidden");

        document.getElementById("finalScore").textContent =
            result.score + " / " + result.total_marks;

        document.getElementById("resultMessage").textContent =
            "You answered " + result.correct + " out of " +
            result.total + " questions correctly.";
    } catch (error) {
        alert(error.message);
    }
}

loadSummary();
loadQuizOptions();
loadQuizList();
loadResults();