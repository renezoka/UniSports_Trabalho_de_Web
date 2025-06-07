const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: props => `${props.value} não é um e-mail válido!`
        }
    },
    username: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    // Isso está correto para manter referências às turmas
    turmas: [{
        type: mongoose.Schema.Types.ObjectId, // Para referências
        ref: 'Turma'
    }]
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Adicione isto para popular automaticamente as turmas
userSchema.virtual('turmasDetails', {
    ref: 'Turma',
    localField: 'turmas',
    foreignField: '_id',
    justOne: false
});

const User = mongoose.model('User', userSchema);

module.exports = User;