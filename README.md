# Sistema CITi · João Felipe

Site interativo feito para o processo seletivo do CITi 2026.2. Cada planeta do sistema solar é a entrega de uma subárea (Dados, Marketing, Dev, Gente e Gestão, Produto e Comercial), e o Sol é a minha apresentação.

## O que tem dentro

- **Three.js** para a cena 3D, com superfícies dos planetas geradas por shaders (sem imagens de textura)
- **Leis de Kepler** nas órbitas (elipses, velocidade variável e períodos proporcionais à distância) e na passagem do cometa
- **Web Audio API** para a trilha ambiente gerada em tempo real e o som próprio de cada planeta
- Um arquivo só (`index.html`), mais o vídeo de apresentação e a capa dele

## Como rodar localmente

Abra a pasta no terminal e rode um servidor simples:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.
