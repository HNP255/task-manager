const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);
});

router.post('/', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run(title);
  res.status(201).json({ id: result.lastInsertRowid, title, done: 0 });
});

router.put('/:id', (req, res) => {
  const { done } = req.body;
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(done ? 1 : 0, req.params.id);
  res.json({ updated: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;