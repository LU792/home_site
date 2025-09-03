// server.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conectar SQLite
const db = new sqlite3.Database("./banco/banco-geral.db", (err) => {
  if (err) return console.error(err.message);
  console.log("Conectado ao banco-geral.db");
});

// ---------------- Tabelas ----------------
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE,
      senha TEXT,
      nome TEXT,
      nivel INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto TEXT,
      quantidade INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipoConta TEXT,
      valor REAL,
      data TEXT,
      foto TEXT
    )
  `);
});

// ---------------- Endpoints ----------------

// Login
app.get("/login", (req, res) => {
  const { usuario, senha } = req.query;
  if (!usuario || !senha) return res.json({ error: "Dados incompletos" });

  const query = `SELECT * FROM usuarios WHERE login = ? AND senha = ?`;
  db.get(query, [usuario, senha], (err, row) => {
    if (err) return res.json({ error: err.message });
    if (!row) return res.json({ error: "Usuário ou senha incorretos" });
    res.json({ id: row.id, nome: row.nome, nivel: row.nivel, login: row.login });
  });
});

// Cadastro Produto
app.post("/produtos", (req, res) => {
  const { produto, quantidade } = req.body;
  if (!produto || !quantidade) return res.status(400).json({ error: "Campos obrigatórios" });

  const query = `INSERT INTO produtos (produto, quantidade) VALUES (?, ?)`;
  db.run(query, [produto, quantidade], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Listar Produtos (opcional)
app.get("/produtos", (req, res) => {
  db.all(`SELECT * FROM produtos`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Cadastro Contas
app.post("/contas", (req, res) => {
  const { tipoConta, valor, foto } = req.body;
  const data = new Date().toISOString();
  if (!tipoConta || !valor) return res.status(400).json({ error: "Campos obrigatórios" });

  const query = `INSERT INTO contas (tipoConta, valor, data, foto) VALUES (?, ?, ?, ?)`;
  db.run(query, [tipoConta, valor, data, foto || ""], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Gastos do Mês
app.get("/gastos", (req, res) => {
  const { mes, ano } = req.query;
  if (!mes || !ano) return res.status(400).json({ error: "Mes e Ano obrigatórios" });

  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const end = `${ano}-${String(mes).padStart(2, "0")}-31`;

  // Contas do mês
  db.all(`SELECT * FROM contas WHERE data BETWEEN ? AND ?`, [start, end], (err, contas) => {
    if (err) return res.status(500).json({ error: err.message });

    // Produtos (somente lista total)
    db.all(`SELECT * FROM produtos`, [], (err2, produtos) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const total = contas.reduce((acc, c) => acc + c.valor, 0);

      res.json({ contas, produtos, total });
    });
  });
});

// ---------------- Servidor ----------------
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
