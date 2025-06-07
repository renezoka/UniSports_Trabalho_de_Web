const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const User = require('./models/User');
const Turma = require('./models/Turma');

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

// Rotas de autenticação (usuário)
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
                return res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: savedUser });
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

        return res.status(200).json({ 
            message: 'Login bem-sucedido.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        console.error('❌ Erro ao realizar login:', error);
        return res.status(500).json({ message: 'Erro ao realizar login.', error: error.message });
    }
});

// Rotas para Turmas (CRUD)
app.post('/api/turmas', async (req, res) => {
    try {
        const { name, type, number, createdBy } = req.body;
        
        // Verifica se o usuário criador existe
        const user = await User.findById(createdBy);
        if (!user) {
            return res.status(404).json({ message: 'Usuário criador não encontrado.' });
        }

        const newTurma = new Turma({ 
            name, 
            type, 
            number,
            createdBy 
        });

        await newTurma.save();
        
        // Associa a turma ao usuário criador
        user.turmas.push(newTurma._id);
        await user.save();

        res.status(201).json(newTurma);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/turmas', async (req, res) => {
    try {
        const turmas = await Turma.find().populate('createdBy', 'name email');
        res.json(turmas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/turmas/:id', async (req, res) => {
    try {
        const turma = await Turma.findById(req.params.id).populate('createdBy', 'name email');
        if (!turma) {
            return res.status(404).json({ message: 'Turma não encontrada' });
        }
        res.json(turma);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/turmas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const updatedTurma = await Turma.findByIdAndUpdate(id, { name }, { new: true });
        res.json(updatedTurma);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/turmas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Remove a turma dos usuários que a tinham
        await User.updateMany(
            { turmas: id },
            { $pull: { turmas: id } }
        );
        
        await Turma.findByIdAndDelete(id);
        res.json({ message: 'Turma excluída com sucesso' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Rotas para relação Usuário-Turma
app.post('/api/users/:userId/turmas', async (req, res) => {
    try {
        const { userId } = req.params;
        const { turmaId } = req.body;

        const [user, turma] = await Promise.all([
            User.findById(userId),
            Turma.findById(turmaId)
        ]);

        if (!user || !turma) {
            return res.status(404).json({ 
                message: !user ? 'Usuário não encontrado' : 'Turma não encontrada' 
            });
        }

        if (!user.turmas.includes(turmaId)) {
            user.turmas.push(turmaId);
            await user.save();
        }

        res.status(200).json(await User.findById(userId).populate('turmas'));
    } catch (error) {
        res.status(500).json({ 
            message: 'Erro ao associar turma', 
            error: error.message 
        });
    }
});

app.get('/api/users/:userId/turmas', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('turmas');
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
        
        res.status(200).json(user.turmas);
    } catch (error) {
        res.status(500).json({ 
            message: 'Erro ao buscar turmas', 
            error: error.message 
        });
    }
});

app.delete('/api/users/:userId/turmas/:turmaId', async (req, res) => {
    try {
        const { userId, turmaId } = req.params;
        
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { turmas: turmaId } },
            { new: true }
        ).populate('turmas');
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ 
            message: 'Erro ao remover turma do usuário', 
            error: error.message 
        });
    }
});

// Rota padrão para servir o HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Tela-Turmas', 'Public', 'telasIniciais.html'));
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});