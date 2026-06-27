const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function computeScore(r) {
  let score = 0;
  if (r.projetAfrique && r.projetAfrique.includes('Oui')) score += 3;
  if (r.accompagnement === 'Oui') score += 2;
  if (r.echange === 'Oui') score += 1;
  if (r.statut === 'Entrepreneur' || r.statut === 'Salarié') score += 1;
  if (r.besoin && r.besoin.trim() !== '') score += 1;
  return score;
}

function getTemperature(score) {
  if (score >= 5) return 'hot';
  if (score >= 3) return 'warm';
  return 'cold';
}

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/data', (req, res) => {
  const data = readData();
  const enriched = data.map(r => {
    const score = computeScore(r);
    return { ...r, score, temperature: getTemperature(score) };
  });
  res.json(enriched);
});

app.get('/api/summary', (req, res) => {
  const data = readData();
  const total = data.length;
  const avgNote = total ? (data.reduce((s, r) => s + r.note, 0) / total).toFixed(2) : 0;
  const excellentCount = data.filter(r => r.noteLabel === 'Excellent').length;
  const tauxExcellent = total ? Math.round((excellentCount / total) * 100) : 0;

  const enriched = data.map(r => ({ ...r, score: computeScore(r), temperature: getTemperature(computeScore(r)) }));
  const hotLeads = enriched.filter(r => r.temperature === 'hot').length;

  const statutCounts = {};
  data.forEach(r => {
    statutCounts[r.statut] = (statutCounts[r.statut] || 0) + 1;
  });

  const noteCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data.forEach(r => { noteCounts[r.note] = (noteCounts[r.note] || 0) + 1; });

  res.json({ total, avgNote, tauxExcellent, hotLeads, statutCounts, noteCounts });
});

app.post('/api/respondent', (req, res) => {
  const data = readData();
  const r = {
    ...req.body,
    submittedAt: new Date().toISOString()
  };
  data.push(r);
  writeData(data);
  const score = computeScore(r);
  res.status(201).json({ ...r, score, temperature: getTemperature(score) });
});

app.listen(3000, () => console.log('Dashboard running at http://localhost:3000'));
