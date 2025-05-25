const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const User = require('./models/User');

const app = express();
const port = 3001; 

const cors = require('cors');
app.use(cors());

mongoose.connect('mongodb+srv://reneshow:lKRwjaxZcHC0nLFb@unisports.sqnspo5.mongodb.net/?retryWrites=true&w=majority&appName=uniSPORTS', {
    dbName: 'unisports'
  })
  .then(() => console.log('✅ Conectado ao MongoDB Atlas (banco: unisports)'))
  .catch((error) => console.error('❌ Erro ao conectar ao MongoDB:', error));

app.use(bodyParser.json());
app.use('/Public', express.static(path.join(__dirname, 'Public'))); 

app.use(express.static(path.join(__dirname, 'Public')));

// Rota padrão para servir o HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'telasIniciais.html'));
});

app.post('/register', async (req, res) => {
    console.log('➡️ Dados recebidos para registro:', req.body);
    const { name, email, username, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Email ou nome de usuário já cadastrado.' });
        }
        const newUser = new User({ name, email, username, password });
        console.log('➡️ Tentando salvar o novo usuário:', newUser);
        newUser.save()
            .then(savedUser => {
                console.log('✅ Usuário salvo com sucesso:', savedUser);
                return res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
            })
            .catch(error => {
                console.error('❌ Erro AO SALVAR o usuário:', error);
                return res.status(500).json({ message: 'Erro ao registrar usuário (falha ao salvar).', error: error.message });
            });

    } catch (error) {
        console.error('❌ Erro ao cadastrar usuário (antes de salvar):', error);
        return res.status(500).json({ message: 'Erro ao registrar usuário.', error: error.message });
    }
});


app.post('/login', async (req, res) => {
    console.log('➡️ Recebida requisição de login:', req.body);
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ $or: [{ email: username }, { username }] });

        if (!user || user.password !== password) {
            return res.status(400).json({ message: 'Usuário ou senha inválidos.' });
        }

        return res.status(200).json({ message: 'Login bem-sucedido.' });
    } catch (error) {
        console.error('❌ Erro ao realizar login:', error);
        return res.status(500).json({ message: 'Erro ao realizar login.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});