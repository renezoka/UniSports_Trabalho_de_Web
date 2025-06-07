const mongoose = require('mongoose');

const turmaSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    number: { type: String, required: true },
    period: { type: String, default: "2025.1" },
    createdAt: { type: Date, default: Date.now },
    createdBy: {  // Adicionei esse campo para saber quem criou a turma
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const Turma = mongoose.model('Turma', turmaSchema);

module.exports = Turma;