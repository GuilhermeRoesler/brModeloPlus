# BrModeloPlus

> Modelagem de dados moderna — conceitual, lógico e físico — no navegador, com modo local ou colaboração na nuvem.

**BrModeloPlus** é uma ferramenta web de modelagem de banco de dados, inspirada no clássico brModelo. Permite criar diagramas ER no navegador, com persistência local (`localStorage`) ou Firebase (auth + sync + colaboração em tempo real).

![](public/demo.png)

## Funcionalidades

- **3 modos de modelagem**
  - **Conceitual:** entidades (incluindo fracas), relacionamentos e atributos na notação Heuser (círculo + rótulo; chave / derivado / multivalorado).
  - **Lógico:** estruturas relacionais.
  - **Físico:** tabelas, colunas, tipos, PK/FK e geração de SQL DDL.
- **Editor**
  - Drag-and-drop, zoom (scroll do mouse), pan (arrastar), seleção múltipla (Shift + arrastar) via **React Flow**.
  - Atributos seguem o dono com **`parentId`** nativo do React Flow.
  - Painel de propriedades.
  - **Auto layout** (**ELK.js stress** na estrutura entidade–relacionamento–entidade; atributos em órbita ao redor do dono).
  - **Conectar:** arrastar do handle de um nó até outro (modo Conectar).
  - **Enter** (modo conceitual): cria atributo já ligado à entidade/relacionamento (ou irmão do atributo selecionado), com edição inline do nome; Enter de novo cria o próximo.
  - Rótulo do atributo à esquerda ou à direita do círculo conforme o lado do dono.
- **Colaboração em tempo real** (com Firebase): cursores remotos e sync do diagrama.
- **Geração de SQL:** `CREATE TABLE` a partir do modelo físico.
- **Auth híbrida:** Google, anônimo, ou guest local sem API key.
- **Projetos:** criar, listar e excluir diagramas (nuvem ou `localStorage`).

## Tecnologias

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build:** [Vite](https://vitejs.dev/)
- **UI:** [Tailwind CSS v4](https://tailwindcss.com/), [Lucide](https://lucide.dev/)
- **Canvas / layout:** [React Flow](https://reactflow.dev/) (`@xyflow/react`), [ELK.js](https://www.eclipse.org/elk/)
- **BaaS (opcional):** [Firebase](https://firebase.google.com/) Auth + Firestore
## Como executar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### 1. Clonar e instalar

```bash
git clone https://github.com/seu-usuario/brmodeloplus.git
cd brmodeloplus
npm install
```

### 2. Firebase (opcional)

Crie `.env` na raiz:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

> Sem `VITE_FIREBASE_API_KEY`, o app sobe em **modo local** e abre direto no dashboard: projetos e salas no `localStorage`; colaboração desabilitada. As demais variáveis só são necessárias com a API key.

> No console Firebase (modo nuvem): habilite Authentication (Google + Anônimo) e Firestore com regras adequadas ao ambiente.

### 3. Dev server

```bash
npm run dev
```

Acesse `http://localhost:5173`.

## Estrutura do código

```
src/
  App.tsx                 # Roteador (login → dashboard → editor)
  config/                 # Firebase, flags e constantes de UI
  types/                  # Tipos do domínio (nós, conexões, projetos)
  lib/                    # Utils puros (SQL, localStorage, autoLayout/ELK, nodeGeometry, reactFlowAdapter, roomNormalize)
  services/               # Persistência (projetos e salas: local ou Firestore)
  hooks/                  # useAuth, useProjects
  components/
    auth/                 # LoginScreen
    dashboard/            # DashboardScreen
    editor/               # Editor, React Flow canvas, toolbar, painéis
      flow/               # Nós/edges HTML + cursors remotos
    ui/                   # Componentes reutilizáveis
```
Spec detalhada para agentes e contribuidores: [`.cursor/skills/brmodelo-plus/SKILL.md`](.cursor/skills/brmodelo-plus/SKILL.md).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (`tsc` + Vite)
- `npm run lint` — ESLint
- `npm run preview` — preview do build

## Contribuição

Contribuições são bem-vindas (Issues e Pull Requests).

1. Fork + branch (`git checkout -b feature/sua-feature`)
2. Implemente a mudança na **camada correta** (ver skill)
3. **Documentação viva:** atualize `.cursor/skills/brmodelo-plus/SKILL.md` e este `README.md` sempre que o comportamento, a arquitetura, o setup ou as funcionalidades mudarem — no mesmo PR
4. `npm run build` ok
5. Abra o Pull Request

## Licença

MIT — veja o arquivo `LICENSE` no repositório.

---

Feito por [Guilherme Roesler](https://github.com/guilhermeroesler)
