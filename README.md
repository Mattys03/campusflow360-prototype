# CampusFlow 360

Um sistema inteligente de abertura e triagem de chamados (Help Desk) voltado para o ambiente acadêmico, otimizando a manutenção da infraestrutura de um campus.

## Problema Resolvido
Professores e alunos costumam abrir chamados classificando tudo como "urgente", lotando a fila de manutenção de forma desorganizada. O CampusFlow 360 resolve isso impondo um processo de **Triagem obrigatória** e um **Algoritmo de previsão de falhas** para atuar de forma preventiva.

## Como Funciona
- **Abertura Restrita:** Professores e alunos apenas relatam o problema e o local, sem permissão para definir a urgência do chamado.
- **Triagem pela Gestão:** A equipe de gestão recebe os chamados na tela de Triagem e define se a prioridade é Alta ou Baixa antes de enviá-los para a fila de manutenção ativa.
- **Previsão de Falhas:** O sistema monitora o ranking de incidentes (ex: DataShow falhando no bloco B) e alerta a equipe de administração sobre falhas iminentes.
- **Fila de Manutenção:** Administradores gerenciam os chamados, mudando o status (Em Andamento / Resolvido) e mantendo o histórico de resolução.

## Níveis de Acesso
- **Professor / Aluno:** Apenas visualiza o formulário de abertura de chamado.
- **Gestão:** Realiza a triagem dos novos chamados (define prioridade) e visualiza métricas como leitura.
- **Administrador:** Controle técnico completo, altera status, resolve chamados e acompanha o painel preditivo.

## Tecnologias
- HTML, CSS, JavaScript (Vanilla)
- Node.js (Servidor local)
- Chart.js (Gráficos)
