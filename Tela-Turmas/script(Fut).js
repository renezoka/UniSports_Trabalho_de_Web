let jogadores = [];
let jogadorSelecionadoIndex = null;

const quadra = document.getElementById("quadra");
const bolas = document.querySelectorAll(".bola");

const toggleBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');
const container = document.getElementById('mainContainer');

// Sidebar Toggle
toggleBtn.addEventListener('click', () => {
  sidebar.classList.add('active');
  container.classList.add('shifted');
  toggleBtn.style.display = 'none';
});

document.addEventListener('click', (event) => {
  if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
    sidebar.classList.remove('active');
    container.classList.remove('shifted');
    toggleBtn.style.display = 'block';
  }
});

// Drag and Drop para bolas
bolas.forEach(bola => {
  let offsetX, offsetY, isDragging = false;

  bola.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - bola.getBoundingClientRect().left;
    offsetY = e.clientY - bola.getBoundingClientRect().top;
    bola.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const quadraRect = quadra.getBoundingClientRect();
    const newX = e.clientX - quadraRect.left - offsetX;
    const newY = e.clientY - quadraRect.top - offsetY;
    const maxX = quadra.clientWidth - bola.clientWidth;
    const maxY = quadra.clientHeight - bola.clientHeight;
    bola.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
    bola.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    bola.style.cursor = "grab";
  });
});

// INCLUIR JOGADOR
const btnIncluir = document.querySelector('.btn-incluir');
const modal = document.getElementById('modalIncluir');
const fecharModal = document.getElementById('fecharModal');
const formIncluir = document.getElementById('formIncluir');

btnIncluir.addEventListener('click', () => {
  modal.style.display = 'block';
});

fecharModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});

formIncluir.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('nomeJogador').value;
  const posicao = document.getElementById('posicaoJogador').value;
  const foto = document.getElementById('fotoJogador').files[0];

  const novoJogador = {
    nome,
    posicao,
    fotoURL: URL.createObjectURL(foto)
  };

  jogadores.push(novoJogador);
  modal.style.display = 'none';
  formIncluir.reset();
  alert("Jogador adicionado com sucesso!");
});

// VISUALIZAR JOGADORES
const btnVisualizar = document.querySelector('.btn-visualizar');
const listaModal = document.getElementById('listaJogadores');
const fecharLista = document.getElementById('fecharModalLista');
const listaUl = document.getElementById('jogadoresUl');

btnVisualizar.addEventListener('click', () => {
  listaUl.innerHTML = '';
  jogadores.forEach((jogador, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${jogador.nome}</strong> (${jogador.posicao}) [${index}]`;
    listaUl.appendChild(li);
  });
  listaModal.style.display = 'block';
});

fecharLista.addEventListener('click', () => {
  listaModal.style.display = 'none';
});

// EDITAR JOGADOR
const btnEditar = document.querySelector('.btn-editar');
const modalEditar = document.getElementById('modalEditar');
const fecharEditar = document.getElementById('fecharModalEditar');
const formEditar = document.getElementById('formEditar');

btnEditar.addEventListener('click', () => {
  const index = prompt("Digite o número do jogador que deseja editar:");
  if (index !== null && jogadores[index]) {
    jogadorSelecionadoIndex = index;
    document.getElementById('editarNome').value = jogadores[index].nome;
    document.getElementById('editarPosicao').value = jogadores[index].posicao;
    modalEditar.style.display = 'block';
  } else {
    alert("Jogador inválido.");
  }
});

fecharEditar.addEventListener('click', () => {
  modalEditar.style.display = 'none';
});

formEditar.addEventListener('submit', (e) => {
  e.preventDefault();
  jogadores[jogadorSelecionadoIndex].nome = document.getElementById('editarNome').value;
  jogadores[jogadorSelecionadoIndex].posicao = document.getElementById('editarPosicao').value;
  modalEditar.style.display = 'none';
  alert("Jogador atualizado com sucesso!");
});

// DELETAR JOGADOR
const btnDeletar = document.querySelector('.btn-deletar');

btnDeletar.addEventListener('click', () => {
  const index = prompt("Digite o número do jogador que deseja excluir:");
  if (index !== null && jogadores[index]) {
    if (confirm(`Deseja realmente excluir o jogador ${jogadores[index].nome}?`)) {
      jogadores.splice(index, 1);
      alert("Jogador removido com sucesso!");
    }
  } else {
    alert("Jogador inválido.");
  }
});
