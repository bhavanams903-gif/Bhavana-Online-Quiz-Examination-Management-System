const express = require("express");
const mysql = require("mysql8");
const path = require("path");

const app = express();
const PORT = 3000;

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "time09",
    database: "onlinequiz"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("MySQL connected successfully");
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "publicd")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "publicd", "index.html"));
});

app.get("/api/summary", (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM quizzes) AS totalQuizzes,
            (SELECT COUNT(*) FROM questions) AS totalQuestions,
            (SELECT COUNT(*) FROM results) AS totalAttempts
    `;

    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows[0]);
    });
});

app.post("/api/register", (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Enter all required details" });
    }

    db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        [name, email, password, role],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            res.status(201).json({
                message: "Account created successfully",
                user_id: result.insertId
            });
        }
    );
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT user_id, name, email, role FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            if (rows.length === 0) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            res.json(rows[0]);
        }
    );
});

app.get("/api/quizzes", (req, res) => {
    db.query(
        `SELECT q.*,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.quiz_id) AS question_count
        FROM quizzes q ORDER BY q.quiz_id DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.get("/api/quizzes/:id", (req, res) => {
    db.query(
        "SELECT * FROM quizzes WHERE quiz_id = ?",
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            if (rows.length === 0) {
                return res.status(404).json({ error: "Quiz not found" });
            }

            res.json(rows[0]);
        }
    );
});

app.post("/api/quizzes", (req, res) => {
    const { title, subject, total_marks, duration, created_by } = req.body;

    if (!title || !subject || !total_marks || !duration || !created_by) {
        return res.status(400).json({ error: "Enter all quiz details" });
    }

    db.query(
        `INSERT INTO quizzes (title, subject, total_marks, duration, created_by)
        VALUES (?, ?, ?, ?, ?)`,
        [title, subject, total_marks, duration, created_by],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            res.status(201).json({
                message: "Quiz created successfully",
                quiz_id: result.insertId
            });
        }
    );
});

app.put("/api/quizzes/:id", (req, res) => {
    const { title, subject, total_marks, duration } = req.body;

    db.query(
        `UPDATE quizzes SET title = ?, subject = ?, total_marks = ?, duration = ?
        WHERE quiz_id = ?`,
        [title, subject, total_marks, duration, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Quiz not found" });
            }

            res.json({ message: "Quiz updated successfully" });
        }
    );
});

app.delete("/api/quizzes/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM results WHERE quiz_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query("DELETE FROM questions WHERE quiz_id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query("DELETE FROM quizzes WHERE quiz_id = ?", [id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: "Quiz not found" });
                }

                res.json({ message: "Quiz and related records deleted successfully" });
            });
        });
    });
});

app.get("/api/questions/:quiz_id", (req, res) => {
    db.query(
        `SELECT question_id, quiz_id, question_text, option_a, option_b, option_c, option_d
        FROM questions WHERE quiz_id = ? ORDER BY question_id`,
        [req.params.quiz_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.get("/api/managequestions/:quiz_id", (req, res) => {
    db.query(
        "SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_id",
        [req.params.quiz_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.post("/api/questions", (req, res) => {
    const {
        quiz_id, question_text, option_a, option_b,
        option_c, option_d, correct_answer
    } = req.body;

    if (!quiz_id || !question_text || !option_a || !option_b ||
        !option_c || !option_d || !correct_answer) {
        return res.status(400).json({ error: "Enter all question details" });
    }

    db.query(
        `INSERT INTO questions
        (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            res.status(201).json({
                message: "Question added successfully",
                question_id: result.insertId
            });
        }
    );
});

app.put("/api/questions/:id", (req, res) => {
    const {
        question_text, option_a, option_b,
        option_c, option_d, correct_answer
    } = req.body;

    db.query(
        `UPDATE questions SET question_text = ?, option_a = ?, option_b = ?,
        option_c = ?, option_d = ?, correct_answer = ? WHERE question_id = ?`,
        [question_text, option_a, option_b, option_c, option_d, correct_answer, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Question not found" });
            }

            res.json({ message: "Question updated successfully" });
        }
    );
});

app.delete("/api/questions/:id", (req, res) => {
    db.query(
        "DELETE FROM questions WHERE question_id = ?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Question not found" });
            }

            res.json({ message: "Question deleted successfully" });
        }
    );
});

app.post("/api/submitquiz", (req, res) => {
    const { quiz_id, user_id, answers } = req.body;

    db.query(
        "SELECT question_id, correct_answer FROM questions WHERE quiz_id = ?",
        [quiz_id],
        (err, questions) => {
            if (err) return res.status(500).json({ error: err.message });

            if (questions.length === 0) {
                return res.status(400).json({ error: "This quiz has no questions" });
            }

            db.query(
                "SELECT total_marks FROM quizzes WHERE quiz_id = ?",
                [quiz_id],
                (err, quizzes) => {
                    if (err) return res.status(500).json({ error: err.message });

                    if (quizzes.length === 0) {
                        return res.status(404).json({ error: "Quiz not found" });
                    }

                    let correct = 0;

                    questions.forEach(question => {
                        if (answers && answers[question.question_id] === question.correct_answer) {
                            correct++;
                        }
                    });

                    const score = Math.round(
                        correct / questions.length * quizzes[0].total_marks
                    );

                    db.query(
                        `INSERT INTO results
                        (quiz_id, user_id, score, attempted_date, status)
                        VALUES (?, ?, ?, NOW(), 'Completed')`,
                        [quiz_id, user_id, score],
                        (err) => {
                            if (err) return res.status(500).json({ error: err.message });

                            res.json({
                                message: "Quiz submitted successfully",
                                correct: correct,
                                total: questions.length,
                                score: score,
                                total_marks: quizzes[0].total_marks
                            });
                        }
                    );
                }
            );
        }
    );
});

app.get("/api/results/:user_id", (req, res) => {
    db.query(
        `SELECT r.*, q.title, q.subject, q.total_marks
        FROM results r
        JOIN quizzes q ON r.quiz_id = q.quiz_id
        WHERE r.user_id = ?
        ORDER BY r.result_id DESC`,
        [req.params.user_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.get("/api/allresults", (req, res) => {
    db.query(
        `SELECT r.*, u.name, q.title, q.subject, q.total_marks
        FROM results r
        JOIN users u ON r.user_id = u.user_id
        JOIN quizzes q ON r.quiz_id = q.quiz_id
        ORDER BY r.result_id DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});