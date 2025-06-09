const mongoose = require('mongoose');

const turmaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Isso está correto para armazenar o e-mail como string
    createdBy: {
        type: String,
        required: true
    }
});

const Turma = mongoose.model('Turma', turmaSchema);

module.exports = Turma;