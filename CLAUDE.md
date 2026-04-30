# Pelada Manager — Contexto do Projeto

## O que é
Aplicação web para organizar uma pelada semanal de futebol. O organizador gerencia a lista de jogadores, sorteia times equilibrados, controla pagamentos e mantém histórico de todas as peladas.

## Regras de negócio (imutáveis)
- **12 confirmados** → formato 6x6, duração 1h30, valor por jogador: **R$ 28,75**
- **15 confirmados** → formato 5v5v5, duração 2h, valor por jogador: **R$ 30,70**
- A pelada ocorre toda **quinta-feira**
- A lista é aberta toda **segunda-feira** no grupo do WhatsApp
- Times são sorteados **equilibrando a média de ratings** dos jogadores (rating de 1 a 10)
- Pagamento é via **PIX**, controlado manualmente (toggle pago/não pago por jogador)

## Features
- Cadastro de jogadores com rating
- Criação de pelada semanal
- Importação de lista (cola nomes, resolve para cadastrados ou cria novo)
- Detecção automática de formato (12 ou 15 jogadores)
- Sorteio de times balanceados por média
- Controle de pagamento por jogador
- Geração de mensagem de cobrança para WhatsApp
- Registro de gols por pelada
- Dashboard de histórico e estatísticas

## Fora do escopo (não implementar)
- Leitura automática de comprovante PIX
- Integração com WhatsApp API
- Assistências por jogador
- Autenticação/multi-usuário

## Stack
- **Backend:** Python 3.12+, FastAPI, SQLAlchemy, SQLite, Pydantic v2
- **Frontend:** React 18, Vite, Tailwind CSS v3, React Router v6, Axios
- **Monorepo:** /backend e /frontend na raiz

## Convenções
- Variáveis e funções em português
- Arquivos e rotas em inglês/técnico
- Schemas Pydantic: sufixo Create (input), Read (output), Update (PATCH)
- Services sem dependência do FastAPI (lógica pura)
