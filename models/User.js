const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true },
    password: { type: String, required: true },
    turmas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Turma'  // Referência ao modelo Turma
    }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;